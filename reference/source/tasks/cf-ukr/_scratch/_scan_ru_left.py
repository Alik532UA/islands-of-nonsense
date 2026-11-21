# Ищет в украинской карте строки, которые остались русскими (буквы ы э ъ ё есть только в русском).
# Запуск: python -X utf8 _scan_ru_left.py <карта.w3x> [файл-отчёт]
import re, sys, collections
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C

RU = re.compile(r'[ыэъЁё]|\b(?:что|это|или|всем|если|как|уровень|цена|бойцов|урона|сейчас|следующий|командир)\b', re.I)
path = sys.argv[1]
rep = sys.argv[2] if len(sys.argv) > 2 else None
h = mb.open_archive(path)
files = {n: mb.read(h, n) for n in ('war3map.w3u', 'war3map.w3a', 'war3map.w3t', 'war3map.wts', 'war3map.j', 'war3mapSkin.txt')}
mb.dll.SFileCloseArchive(h)
out = []
cnt = collections.Counter()
for name, lv in (('war3map.w3u', False), ('war3map.w3a', True), ('war3map.w3t', False)):
    ver, tabs = C.parse(files[name], lv)
    for t in tabs:
        for o in t:
            for m in o.mods:
                if m[1] == 3 and isinstance(m[4], str) and RU.search(m[4]):
                    cnt[name] += 1
                    out.append(f'{name}\t{o.base}/{getattr(o, "id", "")}\t{m[0]}\t{m[4][:160]}')
for n in ('war3map.wts', 'war3mapSkin.txt'):
    for ln in files[n].decode('utf-8-sig', 'ignore').split('\n'):
        if RU.search(ln):
            cnt[n] += 1
            out.append(f'{n}\t\t\t{ln[:160]}')
for ln in files['war3map.j'].decode('utf-8', 'ignore').split('\n'):
    if '"' in ln and RU.search(ln) and not ln.lstrip().startswith('//'):
        cnt['war3map.j'] += 1
        out.append(f'war3map.j\t\t\t{ln.strip()[:160]}')
print(dict(cnt))
if rep:
    open(rep, 'w', encoding='utf-8').write('\n'.join(out))
else:
    print('\n'.join(out[:60]))
