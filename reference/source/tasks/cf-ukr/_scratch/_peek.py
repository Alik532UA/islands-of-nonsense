import sys, json
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C
exec(open(r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr\_basenames.py', encoding='utf-8').read().split("h = mb.open_archive(r'D:")[0])
for b in ['Ahea', 'ACcl', 'AChv', 'ACbh', 'Ahrp', 'Asph']:
    print(b, NAMES.get(b), '|', TIPS.get(b))
h = mb.open_archive(r'D:\WarcraftIII 1.26a\Maps\cf_ua\CastleFight_mod_v17_ua.w3x')
ver, tabs = C.parse(mb.read(h, 'war3map.w3a'), True)
n = 0
for t in tabs:
    for o in t:
        if o.get('anam') is None and n < 6:
            n += 1
            print(o.id, o.base, [(m[0], m[2], str(m[4])[:30]) for m in o.mods][:12])
ver, tabs = C.parse(mb.read(h, 'war3map.w3u'), False)
n = 0
for t in tabs:
    for o in t:
        if o.get('unam') is None and o.id in ('o007', 'h03B', 'hfoo', 'E00G') :
            print(o.id, o.base, [(m[0], str(m[4])[:30]) for m in o.mods][:14])
