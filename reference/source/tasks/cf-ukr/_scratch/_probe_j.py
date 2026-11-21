import sys
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
import make_base as mb
h = mb.open_archive(sys.argv[1])
j = mb.read(h, 'war3map.j').decode('utf-8')
mb.dll.SFileCloseArchive(h)
for lit in sys.argv[2:]:
    print(lit[:40], '->', lit in j)
