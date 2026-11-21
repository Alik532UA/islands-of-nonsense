import sys, os, re, json
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C
G = r'D:\WarcraftIII 1.26a'
FILES = ['Human', 'Orc', 'Undead', 'NightElf', 'Neutral', 'Common', 'Item', 'Campaign']
DATA = {}   # id -> {Name:, Tip:, Ubertip:, ...}
for mp in ['War3.mpq', 'War3x.mpq', 'War3Patch.mpq', 'War3xlocal.mpq']:
    h = mb.open_archive(os.path.join(G, mp))
    for f in FILES:
        d = mb.read(h, 'Units' + chr(92) + f + 'AbilityStrings.txt')
        if not d:
            continue
        cur = None
        for ln in d.decode('utf-8', 'ignore').replace(chr(13), '').split(chr(10)):
            m = re.match(r'\[(\w{4})\]', ln)
            if m:
                cur = m.group(1)
                DATA.setdefault(cur, {})
            elif cur and '=' in ln and not ln.startswith('//'):
                k, v = ln.split('=', 1)
                DATA[cur][k] = v
h = mb.open_archive(r'D:\WarcraftIII 1.26a\Maps\cf_ua\CastleFight_mod_v17_ua.w3x')
ver, tabs = C.parse(mb.read(h, 'war3map.w3a'), True)
bases = {}
objs = []
for t in tabs:
    for o in t:
        if o.get('anam') is None:
            objs.append(o)
            bases.setdefault(o.base, []).append(o.id)
print('объектов', len(objs), 'уникальных баз', len(bases))
tot = 0
rows = []
for b in bases:
    d = DATA.get(b, {})
    n = len(d.get('Name', '')) + len(d.get('Tip', '')) + len(d.get('Ubertip', '')) + len(d.get('Researchtip', '')) + len(d.get('Researchubertip', ''))
    tot += n
    rows.append((b, d.get('Name'), len(d.get('Ubertip', '')), d.get('Tip', '')[:50]))
print('символов к переводу:', tot, 'баз без данных:', [b for b in bases if b not in DATA])
print([r for r in rows][:12])
# есть ли у объектов-копий свои аб-поля, ключи полей по уровням
print('ключи полей объектов (частота):')
import collections
c = collections.Counter(m[0] for o in objs for m in o.mods)
print(c.most_common(30))
json.dump({'DATA': {b: DATA.get(b, {}) for b in bases}, 'objs': [(o.id, o.base) for o in objs]}, open(r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr\out\abil_src.json', 'w', encoding='utf-8'), ensure_ascii=False)
