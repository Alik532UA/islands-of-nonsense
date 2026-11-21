import sys, os
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
import make_base as mb
G = r'D:\WarcraftIII 1.26a'
for mp in ['War3xlocal.mpq', 'War3Local.mpq', 'War3Patch.mpq', 'War3x.mpq', 'War3.mpq']:
    p = os.path.join(G, mp)
    if not os.path.exists(p):
        print(mp, 'нет')
        continue
    h = mb.open_archive(p)
    for n in ['Units\\HumanUnitStrings.txt', 'Units\\ItemStrings.txt']:
        d = mb.read(h, n)
        if d:
            t = d.decode('utf-8', 'ignore')
            i = t.find('[hfoo]')
            print(mp, n, len(d), repr(t[i:i + 120]) if i >= 0 else '')
        else:
            print(mp, n, None)
