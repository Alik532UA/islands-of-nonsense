p = 'build_ua.py'
s = open(p, encoding='utf-8').read()
a = "hh = mb.open_archive(os.path.join(r'D:\WarcraftIII 1.26a', mp))"
assert s.count(a) == 1
s = s.replace(a, "hh = mb.open_archive(os.path.join(MPQD, mp))")
a = "hh = mb.open_archive(os.path.join(r'D:/WarcraftIII 1.26a', mp))"
assert s.count(a) == 1
s = s.replace(a, "hh = mb.open_archive(os.path.join(MPQD, mp))")
a = "CYR = re.compile('[А-Яа-яЁё]')\n"
assert s.count(a) == 1
s = s.replace(a, a + "# MPQ игры можно взять из копий (когда war3 запущен, StormLib не открывает оригиналы: код 32): set CF_MPQDIR=...\castle-fight\mpqcopy\nMPQD = os.environ.get('CF_MPQDIR', r'D:\WarcraftIII 1.26a')\n")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
