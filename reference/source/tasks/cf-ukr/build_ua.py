# Этап 4: украинская карта = русская v16 + подмена строк по out/strings.tsv -> out/strings_ua.tsv
# Запуск: python -X utf8 build_ua.py 17_ua   -> D:\WarcraftIII 1.26a\Maps\cf_ua\CastleFight_mod_v17_ua.w3x
import os, re, sys, shutil, subprocess, tempfile
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r'D:\WarcraftIII 1.26a\Maps\cf\CastleFight_mod_v37.w3x'
VER = sys.argv[1] if len(sys.argv) > 1 else '18_ua'
OUTD = r'D:\WarcraftIII 1.26a\Maps\cf_ua'
OUT = os.path.join(OUTD, f'CastleFight_mod_v{VER}.w3x')
if len(sys.argv) > 3:  # тестовая сборка: python build_ua.py x <исходная карта> <итоговая карта>
    SRC, OUT = sys.argv[2], sys.argv[3]
    OUTD = os.path.dirname(OUT)
TD = r'D:\Создание карты Warcraft\wc3-td\build'
CYR = re.compile('[А-Яа-яЁё]')
# MPQ игры можно взять из копий (когда war3 запущен, StormLib не открывает оригиналы: код 32): set CF_MPQDIR=...\castle-fight\mpqcopy
MPQD = os.environ.get('CF_MPQDIR', r'D:\WarcraftIII 1.26a')


def unesc(s):
    return re.sub(r'\\(\\|t|n)', lambda m: {'\\': '\\', 't': '\t', 'n': '\n'}[m.group(1)], s)


MAP = {}
ru_rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'out', 'strings.tsv'), encoding='utf-8')][1:]
ua_rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'out', 'strings_ua.tsv'), encoding='utf-8')][1:]
for a, b in zip(ru_rows, ua_rows):
    assert a[0] == b[0]
    if CYR.search(a[2]):
        MAP[unesc(a[2])] = unesc(b[2])
import _new_ua
MAP.update(_new_ua.EXTRA)
# v25: перевод расы «Сборщики» пишет сама сборка RU (castle-fight\race_sbor.py -> race_sbor_ua.json), цифры в текстах берутся из итоговой карты
_rs_json = os.path.join(r'D:\Создание карты Warcraft\castle-fight', 'race_sbor_ua.json')
if os.path.exists(_rs_json):
    import json
    MAP.update(json.load(open(_rs_json, encoding='utf-8')))
print('строк в таблице подмены:', len(MAP))
used = set()


def sub(s):
    if s in MAP:
        used.add(s)
        return MAP[s]
    return s


h = mb.open_archive(SRC)
wts = mb.read(h, 'war3map.wts').decode('utf-8-sig')
j = mb.read(h, 'war3map.j').decode('utf-8')
w3u = mb.read(h, 'war3map.w3u')
w3a = mb.read(h, 'war3map.w3a')
w3t = mb.read(h, 'war3map.w3t')
skin = mb.read(h, 'war3mapSkin.txt').decode('utf-8')
mb.dll.SFileCloseArchive(h)
wts_bom = mb.read  # заглушка, чтобы не забыть: BOM проверяем ниже

# --- wts
eol = '\r\n' if '\r\n' in wts else '\n'
w = wts.replace('\r\n', '\n')
cnt = [0]


def wts_blk(m):
    new = sub(m.group(3))
    if new != m.group(3):
        cnt[0] += 1
    return m.group(1) + m.group(2) + '{\n' + new + '\n}'


w = re.sub(r'(STRING \d+\s*\n)((?://[^\n]*\n)?)\{\n(.*?)\n\}', wts_blk, w, flags=re.S)
print('wts подменено блоков:', cnt[0])
wts_new = w.replace('\n', eol)

# --- j: литералы
cj = [0]
bs = [0]


def j_lit(m):
    raw = m.group(1)
    text = raw.replace('\\"', '"').replace('\\\\', '\\')
    if text in MAP:
        new = sub(text)
        if '\\\\' in raw:
            bs[0] += 1
        cj[0] += 1
        return '"' + new.replace('"', '\\"') + '"'
    return m.group(0)


j_nl = j.replace('\r\n', '\n')
# многострочные литералы оригинала (регулярка литералов их не видит): точечная подмена фрагментов
for _ru, _ua in (('Приготовтесь к призыву!', 'Приготуйтеся до виклику!'),
                 ('(Пожалуйста, не выходите из игры после первого раунда!)', '(Будь ласка, не виходьте з гри після першого раунду!)')):
    assert j_nl.count(_ru) == 1, _ru
    j_nl = j_nl.replace(_ru, _ua)
j_new = re.sub(r'"((?:[^"\\\n]|\\.)*)"', j_lit, j_nl)
print('j литералов подменено:', cj[0], 'с двойным слэшем:', bs[0])

# --- имена стандартных юнитов клиента (русские) -> украинские, для объектов без своего имени
import _base_ua
CNAMES = {}
for mp in ('War3.mpq', 'War3x.mpq', 'War3Patch.mpq', 'War3xlocal.mpq'):
    hh = mb.open_archive(os.path.join(MPQD, mp))
    for fn in ('HumanUnitStrings', 'OrcUnitStrings', 'UndeadUnitStrings', 'NightElfUnitStrings', 'NeutralUnitStrings', 'CampaignUnitStrings'):
        dd = mb.read(hh, 'Units' + chr(92) + fn + '.txt')
        cur = None
        for ln in (dd or b'').decode('utf-8', 'ignore').replace(chr(13), '').split(chr(10)):
            mm = re.match(r'\[(\w{4})\]', ln)
            if mm:
                cur = mm.group(1)
            elif cur and ln.startswith('Name='):
                CNAMES[cur] = ln[5:].strip()
    mb.dll.SFileCloseArchive(hh)
cn = [0]

import _abil_ua
ADATA = {}
for mp in ('War3.mpq', 'War3x.mpq', 'War3Patch.mpq', 'War3xlocal.mpq'):
    hh = mb.open_archive(os.path.join(MPQD, mp))
    for fn in ('Human', 'Orc', 'Undead', 'NightElf', 'Neutral', 'Common', 'Item', 'Campaign'):
        dd = mb.read(hh, 'Units' + chr(92) + fn + 'AbilityStrings.txt')
        cur = None
        for ln in (dd or b'').decode('utf-8', 'ignore').replace(chr(13), '').split(chr(10)):
            mm = re.match(r'\[(\w{4})\]', ln)
            if mm:
                cur = mm.group(1)
                ADATA.setdefault(cur, {})
            elif cur and '=' in ln and not ln.startswith('//'):
                k2, v2 = ln.split('=', 1)
                ADATA[cur][k2] = v2
    mb.dll.SFileCloseArchive(hh)
ca = [0, 0, 0]


def split_lv(s):
    q = re.findall(r'"([^"]*)"', s)
    return q if q else [s]


def patch_abil(o):
    b = o.base
    if b not in _abil_ua.AB or o.get('anam') is not None:
        return
    nm, ub = _abil_ua.AB[b]
    d = ADATA.get(b, {})
    o.set('anam', nm, typ=3)
    ca[0] += 1
    tips = split_lv(d['Tip']) if d.get('Tip') else []
    ubs = split_lv(d['Ubertip']) if d.get('Ubertip') else []
    ru = d.get('Name', '').strip()
    nlev = max(len(tips), len(ubs), int(o.get('alev') or 1))
    if o.get('atp1') is None and tips:
        for k in range(1, nlev + 1):
            tp = tips[min(k, len(tips)) - 1]
            tp = tp.replace(ru, nm).replace('\u0423\u0440\u043e\u0432\u0435\u043d\u044c', '\u0420\u0456\u0432\u0435\u043d\u044c')
            o.set('atp1', tp, typ=3, lvl=k)
        ca[1] += 1
    if o.get('aub1') is None and ub and ubs:
        for k in range(1, nlev + 1):
            u = ub[min(k, len(ub)) - 1] if isinstance(ub, list) else ub
            o.set('aub1', u.replace('{n}', str(k)), typ=3, lvl=k)
        ca[2] += 1


# подсказки кнопок кузницы (Cf01-Cf03): текст собирает build_cf.py с числами, точной строки в таблице нет
FORGE_PH = [('Сейчас: ', 'Зараз: '), ('Следующий уровень: ', 'Наступний рівень: '), (' урона', ' шкоди'), (' брони', ' броні'),
            ('к доходу', 'до доходу'), ('всем твоим новым бойцам', 'всім твоїм новим бійцям'), (' из ', ' з '), ('Цена ', 'Ціна '),
            ('Командир Алик', 'Командир Алік'), ('Сбрасывается в начале каждого раунда.', 'Скидається на початку кожного раунду.'),
            ('Прокачано полностью: ', 'Прокачано повністю: '),
            (' С 3-го уровня союзники получают половину бонуса.', ' З 3-го рівня союзники отримують половину бонусу.')]


def forge_ua(t):
    for a, b in FORGE_PH:
        t = t.replace(a, b)
    return t


cf_forge = [0]
co = [0]
for data, lv, name in ((w3u, False, 'w3u'), (w3a, True, 'w3a'), (w3t, False, 'w3t')):
    ver, tabs = C.parse(data, lv)
    for t in tabs:
        for o in t:
            for m in o.mods:
                if m[1] == 3 and isinstance(m[4], str) and m[4] in MAP:
                    m[4] = sub(m[4])
                    co[0] += 1
                if m[1] == 3 and m[0] == 'aub1' and getattr(o, 'id', '') in ('Cf01', 'Cf02', 'Cf03') and CYR.search(m[4]) and ('Сейчас:' in m[4] or 'Прокачано' in m[4]):
                    m[4] = forge_ua(m[4])
                    cf_forge[0] += 1
    if name == 'w3u':
        for t in tabs:
            for o in t:
                if o.get('unam') is None and CNAMES.get(o.base) in _base_ua.UNIT_MAP:
                    o.set('unam', _base_ua.UNIT_MAP[CNAMES[o.base]], typ=3)
                    cn[0] += 1
    if name == 'w3a':
        for tb in tabs:
            for o in tb:
                patch_abil(o)
    nd = C.dump(ver, tabs, lv)
    assert C.dump(*C.parse(nd, lv), lv) == nd
    if name == 'w3u':
        w3u_new = nd
    elif name == 'w3a':
        w3a_new = nd
    else:
        w3t_new = nd
print('подсказок кузницы переведено по шаблону:', cf_forge[0])
print('умений: имён', ca[0], 'подсказок', ca[1], 'описаний', ca[2])
print('объектных строк подменено:', co[0], 'имён стандартных юнитов добавлено:', cn[0])

# --- Skin (Nofood: четыре одинаковых куска через запятую)
skin_new = []
for ln in skin.replace('\r\n', '\n').split('\n'):
    if '=' in ln:
        k, v = ln.split('=', 1)
        if v in MAP:
            ln = k + '=' + sub(v)
    skin_new.append(ln)
skin_new = '\n'.join(skin_new)

print('использовано строк таблицы:', len(used), 'из', len(MAP))
unused = [k for k in MAP if k not in used]
open(os.path.join(HERE, 'out', 'unused.txt'), 'w', encoding='utf-8').write('\n'.join(unused))
print('не нашлось в карте:', len(unused), '(список в out/unused.txt)')

# --- pjass
PJD = tempfile.mkdtemp(prefix='pjass_')
for f in ('common.j', 'Blizzard.j'):
    shutil.copy(os.path.join(TD, 'gamedata', f), PJD)
open(os.path.join(PJD, 'war3map.j'), 'w', encoding='utf-8').write(j_new)
PJ = os.path.join(PJD, 'pjass.exe')
shutil.copy(os.path.join(TD, 'tools', 'pjass.exe'), PJ)
r = subprocess.run([PJ, 'common.j', 'Blizzard.j', 'war3map.j'], cwd=PJD, capture_output=True, text=True, encoding='utf-8', errors='replace')
print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else 'pjass: пусто')
if r.returncode != 0:
    sys.exit(r.stdout[-2500:])

# --- запись
os.makedirs(OUTD, exist_ok=True)
if os.path.exists(OUT):
    sys.exit(f'{OUT} уже есть, укажи другую версию')
shutil.copyfile(SRC, OUT)
h = mb.open_archive(OUT)
bom = b'\xef\xbb\xbf' if mb.read(h, 'war3map.wts')[:3] == b'\xef\xbb\xbf' else b''
mb.write_files(h, {'war3map.wts': bom + wts_new.encode('utf-8'), 'war3map.j': j_new.encode('utf-8'),
                   'war3map.w3u': w3u_new, 'war3map.w3a': w3a_new, 'war3map.w3t': w3t_new, 'war3mapSkin.txt': skin_new.encode('utf-8')})
mb.dll.SFileCloseArchive(h)
print('OK', OUT)
