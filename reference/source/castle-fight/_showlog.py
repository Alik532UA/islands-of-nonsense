# Печатает лог автотеста (Logs\cftest.txt) читаемо: кириллица из Preload склеена в mojibake, здесь она чинится.
# Использование: python -X utf8 _showlog.py [фильтр1 фильтр2 ...]   (строка попадает, если содержит любой фильтр; без фильтров всё)
# Примеры: python -X utf8 _showlog.py "I " FINISH     python -X utf8 _showlog.py   (весь лог)
# Верхняя строка: итог. PASS только если есть FINISH; число шагов idle до старта и SPELL-шум не считаются ошибкой.
import re
import sys

LOG = r'D:\WarcraftIII 1.26a\Logs\cftest.txt'
flt = sys.argv[1:]
lines = []
for ln in open(LOG, encoding='utf-8', errors='replace'):
    m = re.search(r'Preload\( "(.*)" \)', ln)
    if not m:
        continue
    s = m.group(1)
    try:
        s = s.encode('latin1').decode('utf-8')
    except Exception:
        pass
    lines.append(s)
fin = any(s.startswith('FINISH') for s in lines)
print('ИТОГ:', 'FINISH есть (тест дошёл до конца)' if fin else 'FINISH НЕТ (тест не завершён, это не успех)', '| строк:', len(lines))
for s in lines:
    if not flt or any(f in s for f in flt):
        print(s)
