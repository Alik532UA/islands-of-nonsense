p = r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr\_tr.py'
lines = open(p, encoding='utf-8').read().split('\n')
for k, ln in enumerate(lines):
    if ln.startswith("    return re.sub(r'(\\d)("):
        lines[k] = "    return re.sub(r'(\\d)(шкоди|секунди)', r'\\1 \\2', ''.join(parts))"
        print('fixed', k)
open(p, 'w', encoding='utf-8').write('\n'.join(lines))
