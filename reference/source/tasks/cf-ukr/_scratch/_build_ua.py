import re, sys, collections
sys.path.insert(0, '.')
import _tr
pairs, full = _tr.load()
rows = [l.rstrip('\n').split('\t') for l in open('out/strings.tsv', encoding='utf-8')][1:]
WORD = r"[А-Яа-яЁёІіЇїЄєҐґ'-]{2,}"
V = set()
for i, s, tt in rows:
    for w in re.findall(WORD, _tr.TOK.sub(' ', tt)):
        V.add(w.lower())
out = []
bad = collections.defaultdict(list)
CODES = re.compile(r'\|[cC][0-9a-fA-F]{8}|\|[rR]|\|n|%[sd]|\[[^\]]*\]')
LONGDASH = re.compile('[' + chr(8212) + chr(8211) + chr(8213) + ']')
for i, s, t in rows:
    if not _tr.CYR.search(t):
        out.append((i, s, t))
        continue
    u = _tr.tr(t, pairs, full)
    out.append((i, s, u))
    if CODES.findall(u) != CODES.findall(t):
        bad['codes'].append(i)
    if re.search('[ыэёъЫЭЁЪ]', u):
        bad['ruletter'].append(i)
    if re.search('[а-яіїєґА-ЯІЇЄҐ][a-zA-Z]|[a-zA-Z][а-яіїєґА-ЯІЇЄҐ]', _tr.TOK.sub(' ', u)):
        bad['mixed'].append(i)
    if LONGDASH.search(u) or chr(0x2bc) in u:
        bad['dash'].append(i)
    ws = [w for w in re.findall(WORD, _tr.TOK.sub(' ', u)) if w.lower() in V and w.lower() not in _tr.ALLOW]
    if ws:
        bad['rem'].append((i, ws))
with open('out/strings_ua.tsv', 'w', encoding='utf-8') as f:
    f.write('id\tsources\tua\n')
    for i, s, u in out:
        f.write(f'{i}\t{s}\t{u}\n')
for k, v in bad.items():
    print(k, len(v))
c = collections.Counter(w.lower() for i, ws in bad['rem'] for w in ws)
print(c.most_common(100))
print('rem rows sample', [(i, ws[:4]) for i, ws in bad['rem'][:12]])
print('mixed', bad['mixed'][:10], 'codes', bad['codes'][:10], 'ru', bad['ruletter'][:10])
