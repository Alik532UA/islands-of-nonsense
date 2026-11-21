import re, glob
base = r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr'
M = {'e': 'е', 'a': 'а', 'o': 'о', 'p': 'р', 'c': 'с', 'x': 'х', 'y': 'у', 'i': 'і'}
rx = re.compile(r'([а-яіїєґ])([a-z])|([a-z])([а-яіїєґ])')
for f in glob.glob(base + r'\out\tr_*.txt') + glob.glob(base + r'\_dict_*.py'):
    t = open(f, encoding='utf-8').read()
    new = t
    # слова целиком: латинская буква внутри кириллического слова
    def fix(m):
        w = m.group(0)
        return ''.join(M.get(ch, ch) if ch in M and re.search('[а-яіїєґ]', w) else ch for ch in w)
    new = re.sub(r"[а-яіїєґ]+[a-z]+[а-яіїєґ]*|[а-яіїєґ]*[a-z]+[а-яіїєґ]+", lambda m: fix(m) if not re.fullmatch(r'[a-z]+', m.group(0)) else m.group(0), t)
    if new != t:
        diff = [(a, b) for a, b in zip(re.findall(r"\S+", t), re.findall(r"\S+", new)) if a != b][:8]
        print(f, diff)
        open(f, 'w', encoding='utf-8').write(new)
