p = r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr\build_ua.py'
t = open(p, encoding='utf-8').read()
BS = chr(92)
# 1. загрузка данных умений клиента
loader = '''
import _abil_ua
ADATA = {}
for mp in ('War3.mpq', 'War3x.mpq', 'War3Patch.mpq', 'War3xlocal.mpq'):
    hh = mb.open_archive(os.path.join(r'D:/WarcraftIII 1.26a', mp))
    for fn in ('Human', 'Orc', 'Undead', 'NightElf', 'Neutral', 'Common', 'Item', 'Campaign'):
        dd = mb.read(hh, 'Units' + chr(92) + fn + 'AbilityStrings.txt')
        cur = None
        for ln in (dd or b'').decode('utf-8', 'ignore').replace(chr(13), '').split(chr(10)):
            mm = re.match(r'\\[(\\w{4})\\]', ln)
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
            tp = tp.replace(ru, nm).replace('\\u0423\\u0440\\u043e\\u0432\\u0435\\u043d\\u044c', '\\u0420\\u0456\\u0432\\u0435\\u043d\\u044c')
            o.set('atp1', tp, typ=3, lvl=k)
        ca[1] += 1
    if o.get('aub1') is None and ub and ubs:
        for k in range(1, nlev + 1):
            u = ub[min(k, len(ub)) - 1] if isinstance(ub, list) else ub
            o.set('aub1', u.replace('{n}', str(k)), typ=3, lvl=k)
        ca[2] += 1

'''
t = t.replace("cn = [0]\n", "cn = [0]\n" + loader, 1)
t = t.replace("    nd = C.dump(ver, tabs, lv)", "    if name == 'w3a':\n        for tb in tabs:\n            for o in tb:\n                patch_abil(o)\n    nd = C.dump(ver, tabs, lv)", 1)
t = t.replace("print('объектных строк подменено:', co[0],", "print('умений: имён', ca[0], 'подсказок', ca[1], 'описаний', ca[2])\nprint('объектных строк подменено:', co[0],", 1)
open(p, 'w', encoding='utf-8').write(t)
# AOsf: описания по уровням
q = r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr\_abil_ua.py'
a = open(q, encoding='utf-8').read()
i = a.index("'AOsf':")
j = a.index('\n', i)
base = "Виклик <AOsf,DataB{n}> магічних вовків, що супроводжують героя%s. Кожен вовк має запас здоров'я в <osw{n},realHP> од. і завдає від <osw{n},mindmg1> до <osw{n},maxdmg1> од. шкоди.|nЧас дії - <AOsf,Dur{n}> с. |n|n|cffffcc00Вовки можуть атакувати наземні цілі.|r"
new = "'AOsf': ('Дух вовка', [" + ', '.join(repr(base % x) for x in ('', ' і мають здатність \u00abСмертельний удар\u00bb', ' мають здатність \u00abСмертельний удар\u00bb і невидимі, доки не почнуть атакувати')) + ']),'
a = a[:i] + new + a[j:]
open(q, 'w', encoding='utf-8').write(a)
print('ok')
