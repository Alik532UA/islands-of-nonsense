# Достаёт базовые SLK юнитов из MPQ игры (patch важнее)
import sys, ctypes, os
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
import make_base as mb
G = r'D:\WarcraftIII 1.26a'
os.makedirs('slk', exist_ok=True)
for f in ['UnitBalance.slk', 'UnitWeapons.slk', 'UnitData.slk']:
    for m in ['War3Patch.mpq', 'War3x.mpq', 'war3.mpq']:
        h = mb.open_archive(os.path.join(G, m))
        fh = mb.H()
        name = 'Units\\' + f
        if mb.dll.SFileOpenFileEx(h, name.encode(), 0, ctypes.byref(fh)):
            mb.dll.SFileCloseFile(fh)
            d = mb.read(h, name)
            open(os.path.join('slk', f), 'wb').write(d)
            print(f, m, len(d))
            mb.dll.SFileCloseArchive(h)
            break
        mb.dll.SFileCloseArchive(h)
