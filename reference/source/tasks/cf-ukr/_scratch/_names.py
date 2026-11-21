import sys, re, os
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb, cfobj as C
h = mb.open_archive(r'D:\WarcraftIII 1.26a\Maps\cf\CastleFight_mod_v16.w3x')
wts = mb.read(h, 'war3map.wts').decode('utf-8-sig').replace('\r\n', '\n')
trig = {int(m.group(1)): m.group(2) for m in re.finditer(r'STRING (\d+)\s*\n(?://[^\n]*\n)?\{\n(.*?)\n\}', wts, re.S)}
def res(v):
    m = re.fullmatch(r'TRIGSTR_(\d+)', v)
    return trig.get(int(m.group(1)), v) if m else v
out = {}
for fn, lv, flds in [('w3u', False, ('unam',)), ('w3a', True, ('anam',)), ('w3t', False, ('unam', 'inam')), ('w3h', False, ('fnam', 'unam', 'anam')), ('w3b', False, ('bnam',))]:
    d = mb.read(h, 'war3map.' + fn)
    ver, tabs = C.parse(d, lv)
    names = {}
    for t in tabs:
        for o in t:
            for m in o.mods:
                if m[0] in flds and m[1] == 3 and m[4]:
                    names.setdefault(res(m[4]), []).append(o.id)
    out[fn] = names
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'names.txt'), 'w', encoding='utf-8') as f:
    for fn, names in out.items():
        f.write(f'## {fn} {len(names)}\n')
        for n, ids in sorted(names.items()):
            if fn == 'w3a' and re.search(r'Кузница: (атака|броня|эконом)', n):
                continue
            f.write(f'{n.splitlines()[0][:70]}\t{ids[0]}x{len(ids)}\n')
print({k: len(v) for k, v in out.items()})
