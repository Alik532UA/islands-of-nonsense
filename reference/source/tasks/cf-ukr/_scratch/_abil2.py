import sys, re, json, collections
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C
S = json.load(open(r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr\out\abil_src.json', encoding='utf-8'))
DATA = S['DATA']
h = mb.open_archive(r'D:\WarcraftIII 1.26a\Maps\cf_ua\CastleFight_mod_v17_ua.w3x')
ver, tabs = C.parse(mb.read(h, 'war3map.w3a'), True)
AO = {o.id: o for t in tabs for o in t}
ver, tabs = C.parse(mb.read(h, 'war3map.w3u'), False)
used = collections.defaultdict(list)
for t in tabs:
    for o in t:
        for f in ('uabi', 'uhab'):
            v = o.get(f)
            if v:
                for a in str(v).split(','):
                    used[a.strip()].append(o.id)
ver, tabs = C.parse(mb.read(h, 'war3map.w3t'), False)
for t in tabs:
    for o in t:
        v = o.get('iabi')
        if v:
            for a in str(v).split(','):
                used[a.strip()].append(o.id)
print('ссылок на умения из юнитов/предметов:', len(used))
vis = []
for oid, b in S['objs']:
    o = AO[oid]
    has_own_tip = o.get('atp1') is not None
    d = DATA[b]
    if oid in used and not has_own_tip and d.get('Tip'):
        vis.append((oid, b))
nb = sorted({b for _, b in vis})
print('видимых кандидатов (в списке умений юнита, без своей подсказки, у базы есть Tip):', len(vis), 'баз', len(nb))
n = 0
for b in nb:
    d = DATA[b]
    n += len(d.get('Name', '')) + len(d.get('Tip', '')) + len(d.get('Ubertip', ''))
print('символов:', n)
used_all = [(oid, b) for oid, b in S['objs'] if oid in used]
print('используемых умений без anam:', len(used_all), 'баз', len({b for _, b in used_all}))
print(sorted(nb))
json.dump({'vis': vis, 'used_all': used_all}, open(r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr\out\abil_vis.json', 'w'))
