# Таблица силы рас: для каждого здания юнит, его живучесть и урон на 1 золото
import sys, re, math, json
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
import make_base as mb, cfobj as C

SRC = sys.argv[1] if len(sys.argv) > 1 else r'D:\WarcraftIII 1.26a\Maps\Download\Castle_Fight_1.17.w3x'
RACES = {'h00C': 'Люди', 'h00E': 'Наги', 'h00O': 'Хаос', 'h00P': 'Эльфы', 'h018': 'Нежить', 'h019': 'Орки',
         'h017': 'Север', 'u006': 'Порча', 'h089': 'Ночные эльфы', 'h06P': 'Техники'}


def load():
    h = mb.open_archive(SRC)
    ver, tabs = C.parse(mb.read(h, 'war3map.w3u'), False)
    j = mb.read(h, 'war3map.j').decode('utf-8').replace('\r\n', '\n')
    mb.dll.SFileCloseArchive(h)
    return ver, tabs, j


def name(U, i):
    o = U.get(i)
    n = o.get('unam') if o else None
    return re.sub(r'\|c\w{8}|\|r', '', str(n or i))


def table(U, j):
    spawn, prev = {}, {}
    for m in re.finditer(r"call (\w+)\('(\w{4})',(\d+),'(\w{4})',([^\n]*)\)\n", j):
        f, b, yc, sp, rest = m.groups()
        spawn[b] = sp
        if f == 'EC' or (f == 'RC' and b.startswith('cg')):   # RC оригинала (h04P) не считаем: баланс старых рас прежний
            pm = re.match(r"\d+,'(\w{4})'", rest)
            if pm:
                prev[b] = pm.group(1)
    def chain_cost(b):
        c = C.stat(U, b, 'ugol') or 0
        return c + (chain_cost(prev[b]) if b in prev else 0)
    rows = []
    race_of = {}
    for bid, rn in RACES.items():
        if bid not in U:   # раса добавлена сборкой (Сборщики), в оригинале карты её нет
            continue
        for b in (U[bid].get('ubui') or '').split(','):
            race_of[b] = rn
    changed = True
    while changed:
        changed = False
        for b, p in prev.items():
            if p in race_of and b not in race_of:
                race_of[b] = race_of[p]
                changed = True
    for b, sp in spawn.items():
        if b not in race_of:
            continue
        hp = C.stat(U, sp, 'uhpm') or 0
        arm = C.stat(U, sp, 'udef') or 0
        dmg, dice, sides, cd = (C.stat(U, sp, f) for f in ('ua1b', 'ua1d', 'ua1s', 'ua1c'))
        dps = None
        if C.stat(U, sp, 'uaen') not in (0, None) and cd:
            dps = (dmg or 0) + (dice or 1) * ((sides or 1) + 1) / 2
            dps = dps / cd
        cost = chain_cost(b)
        ehp = hp * (1 + 0.06 * arm)
        val = math.sqrt(dps * ehp) / cost * 100 if dps and cost else None
        fly = C.stat(U, sp, 'umvt') == 'fly'
        rows.append(dict(race=race_of[b], b=b, bn=name(U, b), cost=cost, up=b in prev, u=sp, un=name(U, sp), hp=hp,
                         arm=arm, dps=round(dps, 1) if dps else None, val=round(val, 2) if val else None, fly=fly,
                         rng=C.stat(U, sp, 'ua1r')))
    return rows


if __name__ == '__main__':
    ver, tabs, j = load()
    U = {o.id: o for t in tabs for o in t}
    rows = table(U, j)
    json.dump(rows, open('power.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    by = {}
    for r in rows:
        if r['val']:
            by.setdefault(r['race'], []).append(r['val'])
    avg = sum(sum(v) / len(v) for v in by.values()) / len(by)
    for rc, v in sorted(by.items(), key=lambda x: -sum(x[1]) / len(x[1])):
        a = sum(v) / len(v)
        air = sum(1 for r in rows if r['race'] == rc and r['fly'])
        print(f"{rc:14} сила/золото {a:5.2f} ({a / avg * 100 - 100:+.0f}%), зданий {len([r for r in rows if r['race']==rc])}, летающих {air}")
