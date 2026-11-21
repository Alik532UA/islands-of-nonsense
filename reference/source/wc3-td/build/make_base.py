# Делает чистый шаблон карты из стандартной TFT-карты Blizzard на 6 игроков (файл игры не меняется).
# Ровная трава, без деревьев, юнитов и мили-триггеров. Слоты, кланы и w3i остаются оригинальные (проверенные игрой).
# Запуск: python -X utf8 make_base.py "<карта Blizzard (6)*.w3x>" template.w3x
import ctypes, os, re, shutil, struct, sys, tempfile
from ctypes import wintypes

HERE = os.path.dirname(os.path.abspath(__file__))
H = ctypes.c_void_p
dll = ctypes.WinDLL(os.path.join(HERE, "tools", "StormLib.dll"), use_last_error=True)
dll.SFileOpenArchive.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(H)]
dll.SFileOpenFileEx.argtypes = [H, ctypes.c_char_p, wintypes.DWORD, ctypes.POINTER(H)]
dll.SFileGetFileSize.argtypes = [H, ctypes.POINTER(wintypes.DWORD)]
dll.SFileGetFileSize.restype = wintypes.DWORD
dll.SFileReadFile.argtypes = [H, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), ctypes.c_void_p]
dll.SFileCloseFile.argtypes = [H]
dll.SFileAddFileEx.argtypes = [H, wintypes.LPCWSTR, ctypes.c_char_p, wintypes.DWORD, wintypes.DWORD, wintypes.DWORD]
dll.SFileCloseArchive.argtypes = [H]
for f in (dll.SFileOpenArchive, dll.SFileOpenFileEx, dll.SFileReadFile, dll.SFileCloseFile, dll.SFileAddFileEx, dll.SFileCloseArchive):
    f.restype = ctypes.c_bool

def open_archive(path):
    h = H()
    if not dll.SFileOpenArchive(os.path.abspath(path), 0, 0, ctypes.byref(h)):
        sys.exit(f"StormLib не открыл {path}: {ctypes.get_last_error()}")
    return h

def read(h, name):
    fh = H()
    if not dll.SFileOpenFileEx(h, name.encode(), 0, ctypes.byref(fh)):
        return None
    size = dll.SFileGetFileSize(fh, None)
    buf = ctypes.create_string_buffer(size); got = wintypes.DWORD()
    dll.SFileReadFile(fh, buf, size, ctypes.byref(got), None)
    dll.SFileCloseFile(fh)
    return buf.raw[:got.value]

def write_files(h, files):
    tmp = tempfile.mkdtemp()
    for name, data in files.items():
        p = os.path.join(tmp, name)
        open(p, "wb").write(data)
        if not dll.SFileAddFileEx(h, p, name.encode(), 0x00000200 | 0x80000000, 0x02, 0x02):
            sys.exit(f"StormLib не записал {name}: {ctypes.get_last_error()}")

def flat_w3e(e):
    assert e[:4] == b"W3E!"
    ver, = struct.unpack_from("<i", e, 4)
    tileset = e[8:9]
    p = 13
    ng, = struct.unpack_from("<i", e, p); p += 4 + ng * 4
    nc, = struct.unpack_from("<i", e, p); p += 4 + nc * 4
    W, Hh, ox, oy = struct.unpack_from("<iiff", e, p); p += 16
    pts = e[p:]
    assert len(pts) == W * Hh * 7, "неожиданный размер w3e"
    ground = [b"Lgrs", b"Ldrt", b"Ldro", b"Lgrd"]
    cliffs = [b"CLdi", b"CLgr"]
    # флаг 1 = свой список текстур (иначе игра берёт стандартный, где 0 = земля)
    out = bytearray(b"W3E!" + struct.pack("<i", ver) + b"L" + struct.pack("<i", 1))
    out += struct.pack("<i", len(ground)) + b"".join(ground)
    out += struct.pack("<i", len(cliffs)) + b"".join(cliffs)
    out += struct.pack("<iiff", W, Hh, ox, oy)
    for i in range(W * Hh):
        o = i * 7
        w2, = struct.unpack_from("<H", pts, o + 2)
        flags = 0  # флаги края карты внутри поля GnollWood рисовались чёрными пятнами
        out += struct.pack("<HH", 0x2000, w2) + bytes([flags | 0, 0, 0x02])
    return bytes(out), W, Hh

MAP_NAME = "Кооп TD"
MAP_AUTHOR = "Друзі"
MAP_PLAYERS = "3-6 гравців"
MAP_DESC = ("|cffffcc00Кооп TD проти ШІ.|r У кожного своя смуга, прориви забирають спільні життя бази. "
            "Протримайтеся 45 хвиль (близько години), боси на 10, 20, 30, 40 і 45 хвилі.\n"
            "Голосування за складність, 6 рас без повторів (випадкова +30 золота). "
            "Башти з гілками й ефектами, 6 героїв, дослідження, ворота, крамниця, 30 босів виклику.\n"
            "Усе робиться кнопками штабу. |cffffcc00-zoom N|r камера, |cffffcc00-help|r довідка. Повні правила: |cffffcc00F9|r.")

def patch_w3i(w, name):
    """w3i v25: своё имя, флаги «свои кланы + фиксированные настройки» вместо мили, один союзный клан."""
    p = 12
    def skip_str(p):
        return w.index(b"\0", p) + 1
    w = w[:12] + name.encode("utf-8") + w[w.index(b"\0", 12):]
    p = skip_str(12)                       # имя
    # автор, описание, рекомендуемые игроки - тоже прямым текстом (TRIGSTR русский клиент не берёт)
    for val in (MAP_AUTHOR, MAP_DESC, MAP_PLAYERS):
        e = w.index(b"\0", p)
        w = w[:p] + val.encode("utf-8") + w[e:]
        p = skip_str(p)
    p += 32 + 16 + 8                       # границы камеры, дополнения, размер
    flags_at = p
    flags, = struct.unpack_from("<I", w, p)
    flags = (flags & ~0x0004) | 0x0020 | 0x0040
    w = w[:p] + struct.pack("<I", flags) + w[p + 4:]
    p += 4 + 1 + 4                         # флаги, тип земли, экран загрузки
    for _ in range(4): p = skip_str(p)
    p += 4
    for _ in range(4): p = skip_str(p)
    p += 4 + 12 + 4 + 4                    # туман, погода
    p = skip_str(p)                        # звук
    p += 1 + 4                             # освещение, вода
    np_at = p
    nplayers, = struct.unpack_from("<i", w, p); p += 4
    mask = 0
    for _ in range(nplayers):
        num, = struct.unpack_from("<i", w, p)
        mask |= 1 << num
        p += 16; p = skip_str(p); p += 16
    # игрок 12 (индекс 11): компьютер «Враги», владелец крипов. Даёт лобби соперника.
    enemy = struct.pack("<iiii", ENEMY, 2, 3, 1) + "Враги".encode("utf-8") + b"\0" + struct.pack("<ffii", 0.0, 0.0, 0, 0)
    nforces, = struct.unpack_from("<i", w, p)
    forces = struct.pack("<i", 2)
    forces += struct.pack("<iI", 0x07, mask) + "Защитники".encode("utf-8") + b"\0"  # союз, общая победа, общий обзор
    forces += struct.pack("<iI", 0x00, 1 << ENEMY) + "Враги".encode("utf-8") + b"\0"
    w = w[:np_at] + struct.pack("<i", nplayers + 1) + w[np_at + 4:p] + enemy + forces + _after_forces(w, p, nforces)
    print(f"w3i: флаги {flags:#x}, игроков {nplayers}+1, кланов было {nforces}, стало 2")
    return w

ENEMY = 11

def patch_config(j):
    """config в war3map.j должен совпадать с w3i: 7 игроков, 2 клана, игрок 12 компьютер."""
    R = [("call SetPlayers( 6 )", "call SetPlayers( 7 )"),
         ("call SetTeams( 6 )", "call SetTeams( 2 )"),
         ("call DefineStartLocation( 5,", "call DefineStartLocation( 6, 0.0, 0.0 )\n    call DefineStartLocation( 5,"),
         ("call SetPlayerSlotAvailable( Player(5), MAP_CONTROL_USER )",
          "call SetPlayerSlotAvailable( Player(5), MAP_CONTROL_USER )\n    call SetPlayerSlotAvailable( Player(11), MAP_CONTROL_COMPUTER )"),
         ("call SetPlayerTeam( Player(5), 0 )", "call SetPlayerTeam( Player(5), 0 )\n    call SetPlayerTeam( Player(11), 1 )")]
    for a, b in R:
        assert j.count(a) == 1, a
        j = j.replace(a, b)
    i = j.index("function InitCustomPlayerSlots")
    e = j.index("endfunction", i)
    slot = ("\n    // Player 11: враги\n    call SetPlayerStartLocation( Player(11), 6 )\n"
            "    call SetPlayerColor( Player(11), ConvertPlayerColor(11) )\n"
            "    call SetPlayerRacePreference( Player(11), RACE_PREF_UNDEAD )\n"
            "    call SetPlayerRaceSelectable( Player(11), false )\n"
            "    call SetPlayerController( Player(11), MAP_CONTROL_COMPUTER )\n\n")
    return j[:e] + slot + j[e:]

def lane_points(minX, maxX, minY, maxY):
    """Те же точки, что TD_LaneSetup в JASS."""
    w = (maxX - minX) / 6.0
    top, bottom = maxY - 300.0, minY + 300.0
    fx = [0.5, 0.2, 0.8, 0.2, 0.8, 0.5]
    fy = [1.0, 0.80, 0.62, 0.44, 0.26, 0.0]
    return [[(minX + w * i + w * fx[k], bottom + (top - bottom) * fy[k]) for k in range(6)] for i in range(6)]

def minimap_blp(minX, maxX, minY, maxY, size=256):
    """BLP1, палитра, без альфы, полная цепочка mipmap: трава + дороги линий + границы полос."""
    pal = [(50, 140, 45), (75, 110, 145), (30, 30, 30)] + [(0, 0, 0)] * 253  # BGR: трава, дорога, граница
    img = bytearray(size * size)
    def put(px, py, c):
        if 0 <= px < size and 0 <= py < size:
            img[py * size + px] = c
    def tox(x): return int((x - minX) / (maxX - minX) * (size - 1))
    def toy(y): return int((maxY - y) / (maxY - minY) * (size - 1))
    for i in range(1, 6):
        x = tox(minX + (maxX - minX) * i / 6)
        for py in range(size): put(x, py, 2)
    for pts in lane_points(minX, maxX, minY, maxY):
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            n = 200
            for s in range(n + 1):
                px, py = tox(x1 + (x2 - x1) * s / n), toy(y1 + (y2 - y1) * s / n)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        put(px + dx, py + dy, 1)
    mips, cur, sz = [], img, size
    while True:
        mips.append(bytes(cur))
        if sz == 1: break
        nsz = sz // 2
        cur = bytearray(cur[(2 * y) * sz + 2 * x] for y in range(nsz) for x in range(nsz))
        sz = nsz
    head = b"BLP1" + struct.pack("<iiiiii", 1, 0, size, size, 5, 1)
    data_start = len(head) + 16 * 4 * 2 + 256 * 4
    offs, sizes, o = [], [], data_start
    for m in mips:
        offs.append(o); sizes.append(len(m)); o += len(m)
    offs += [0] * (16 - len(offs)); sizes += [0] * (16 - len(sizes))
    palb = b"".join(bytes([b, g, r, 0]) for (b, g, r) in pal)
    return head + struct.pack("<16I", *offs) + struct.pack("<16I", *sizes) + palb + b"".join(mips)

def _after_forces(w, p, n):
    p += 4
    for _ in range(n):
        p += 8; p = w.index(b"\0", p) + 1
    return w[p:]

def main():
    global MAP_NAME
    src, out = sys.argv[1], sys.argv[2]
    if len(sys.argv) > 3:
        MAP_NAME = sys.argv[3]
    shutil.copyfile(src, out)
    h = open_archive(out)
    e = read(h, "war3map.w3e")
    w3e, W, Hh = flat_w3e(e)
    wpm = read(h, "war3map.wpm")
    pw, ph = struct.unpack_from("<ii", wpm, 8)
    shd = read(h, "war3map.shd")
    j = read(h, "war3map.j").decode("utf-8", "replace")
    for line in ("call CreateAllUnits(  )", "call InitCustomTriggers(  )", "call RunInitializationTriggers(  )"):
        assert line in j, line
        j = j.replace(line, "// убрано: " + line)
    wts = read(h, "war3map.wts").decode("utf-8", "replace")
    m = re.search(r"call SetMapName\( \"TRIGSTR_(\d+)\" \)", j)
    d = re.search(r"call SetMapDescription\( \"TRIGSTR_(\d+)\" \)", j)
    def setstr(text, num, val):
        return re.sub(r"(STRING %d\s*\{\s*)(.*?)(\s*\})" % int(num), lambda mm: mm.group(1) + val + mm.group(3), text, flags=re.S)
    wts = setstr(wts, m.group(1), "Кооп TD v0.1")
    wts = setstr(wts, d.group(1), "Кооп Tower Defense на 3-6 игроков. Своя линия у каждого, общие жизни базы.")
    # имя прямо в w3i: иначе русский клиент показывает «Лес гнолов» (проверено картой 4-7)
    w3i = patch_w3i(read(h, "war3map.w3i"), MAP_NAME)
    j = patch_config(j)
    # своя картинка мини-карты (без неё мини-карта чёрная): границы игровой области из SetCameraBounds
    cb = re.search(r"SetCameraBounds\( (-?[\d.]+) \+ [^,]+, (-?[\d.]+) \+ [^,]+, (-?[\d.]+) - [^,]+, (-?[\d.]+) - ", j)
    minX, minY, maxX, maxY = (float(v) for v in cb.groups())
    write_files(h, {
        "war3mapMap.blp": minimap_blp(minX, maxX, minY, maxY),
        "war3map.w3i": w3i,
        "war3map.w3e": w3e,
        "war3map.wpm": wpm[:16] + bytes(pw * ph),
        "war3map.shd": bytes(len(shd)),
        "war3map.doo": b"W3do" + struct.pack("<iiiii", 8, 11, 0, 0, 0),
        "war3mapUnits.doo": b"W3do" + struct.pack("<iii", 8, 11, 0),
        "war3map.mmp": struct.pack("<ii", 0, 0),
        "war3map.j": j.encode("utf-8"),
        "war3map.wts": wts.encode("utf-8"),
    })
    dll.SFileCloseArchive(h)
    print(f"OK {out}: ландшафт {W}x{Hh}, pathing {pw}x{ph}")

if __name__ == "__main__":
    main()
