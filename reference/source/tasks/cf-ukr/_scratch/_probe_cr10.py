# Разведка (только чтение): как выглядит умение расы Сборщиков (Cr10) в украинской карте и есть ли там русский текст; строки командиров в скрипте.
import sys, re
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C
path = sys.argv[1]
h = mb.open_archive(path)
ver, tabs = C.parse(mb.read(h, 'war3map.w3a'), True)
wts = mb.read(h, 'war3map.wts').decode('utf-8-sig')
j = mb.read(h, 'war3map.j').decode('utf-8')
mb.dll.SFileCloseArchive(h)
for t in tabs:
    for o in t:
        if o.id == 'Cr10':
            for m in o.mods:
                if m[0] in ('anam', 'aub1', 'atp1', 'aut1'):
                    print(m[0], '=', str(m[4])[:170])
for lit in ('Командир на этот раунд', 'Командир на цей раунд', 'Саша: +20%', 'Алік: кузня', 'Скидка Алика', 'Знижка Аліка', 'выбрал командира', 'обрав командира'):
    print(lit, '->', lit in j)
