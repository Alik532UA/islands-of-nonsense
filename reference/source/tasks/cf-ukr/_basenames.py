# Русские имена стандартных объектов из клиента и список объектов карты без своего имени
import sys, os, re, json
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C
G = r'D:\WarcraftIII 1.26a'
FILES = ['Units\\HumanUnitStrings.txt', 'Units\\OrcUnitStrings.txt', 'Units\\UndeadUnitStrings.txt', 'Units\\NightElfUnitStrings.txt',
         'Units\\NeutralUnitStrings.txt', 'Units\\CampaignUnitStrings.txt', 'Units\\ItemStrings.txt',
         'Units\\HumanAbilityStrings.txt', 'Units\\OrcAbilityStrings.txt', 'Units\\UndeadAbilityStrings.txt', 'Units\\NightElfAbilityStrings.txt',
         'Units\\NeutralAbilityStrings.txt', 'Units\\CommonAbilityStrings.txt', 'Units\\ItemAbilityStrings.txt', 'Units\\CampaignAbilityStrings.txt']
NAMES = {}
TIPS = {}
for mp in ['War3.mpq', 'War3x.mpq', 'War3Patch.mpq', 'War3xlocal.mpq']:
    h = mb.open_archive(os.path.join(G, mp))
    for fn in FILES:
        d = mb.read(h, fn)
        if not d:
            continue
        cur = None
        for ln in d.decode('utf-8', 'ignore').replace('\r', '').split('\n'):
            m = re.match(r'\[(\w{4})\]', ln)
            if m:
                cur = m.group(1)
            elif cur and ln.startswith('Name='):
                NAMES[cur] = ln[5:].strip()
            elif cur and ln.startswith('Tip='):
                TIPS.setdefault(cur, ln[4:].strip().strip('"').split(',')[0])
print('имён клиента:', len(NAMES))
h = mb.open_archive(r'D:\WarcraftIII 1.26a\Maps\cf_ua\CastleFight_mod_v17_ua.w3x')
res = {}
for fn, lv, nf, tf in (('w3u', False, 'unam', 'utip'), ('w3a', True, 'anam', 'atp1'), ('w3t', False, 'unam', 'utip')):
    d = mb.read(h, 'war3map.' + fn)
    ver, tabs = C.parse(d, lv)
    rows = []
    for t in tabs:
        for o in t:
            if o.get(nf) is None:
                rows.append((o.id, o.base, NAMES.get(o.base, '?'), o.get(tf) is not None))
    res[fn] = rows
    print(fn, len(rows))
json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'noname.json'), 'w', encoding='utf-8'), ensure_ascii=False)
u = res['w3u']
print('юниты без имени, уникальные русские имена:', len(set(r[2] for r in u)))
print('; '.join(sorted(set(r[2] for r in u))))
a = res['w3a']
print('умения без имени и без своего тултипа:', len([r for r in a if not r[3]]), 'из', len(a))
print('; '.join(sorted(set(r[2] for r in a if not r[3]))))
