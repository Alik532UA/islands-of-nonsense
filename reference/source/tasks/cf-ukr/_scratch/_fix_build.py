p = r'D:\Создание карты Warcraft\tasks\2026-11-18-cf-ukr\build_ua.py'
L = open(p, encoding='utf-8').read().split('\n')
i = next(k for k, l in enumerate(L) if "dd = mb.read(hh, 'Units" in l)
j = next(k for k in range(i, i + 8) if L[k].startswith("'):"))
new = ["        dd = mb.read(hh, 'Units' + chr(92) + fn + '.txt')",
       "        cur = None",
       "        for ln in (dd or b'').decode('utf-8', 'ignore').replace(chr(13), '').split(chr(10)):"]
L[i:j + 1] = new
open(p, 'w', encoding='utf-8').write('\n'.join(L))
print(i, j)
