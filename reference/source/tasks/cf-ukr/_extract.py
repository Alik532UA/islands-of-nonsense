# Этап 1: выгрузка всех строк карты v16 в out/strings.tsv
import sys, re, os, collections
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C

MAP = r'D:\WarcraftIII 1.26a\Maps\cf\CastleFight_mod_v16.w3x'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
CYR = re.compile('[А-Яа-яЁёІіЇїЄєҐґ]')

h = mb.open_archive(MAP)
rd = lambda n: mb.read(h, n)

# --- wts
wts = rd('war3map.wts').decode('utf-8-sig').replace('\r\n', '\n')
trig = {}
for m in re.finditer(r'STRING (\d+)\s*\n(?://[^\n]*\n)?\{\n(.*?)\n\}', wts, re.S):
    trig[int(m.group(1))] = m.group(2)
print('wts строк:', len(trig))

entries = []   # (source, key, text)
stat = collections.Counter()

def add(src, key, text):
    entries.append((src, key, text))
    stat[src] += 1

used = set()   # TRIGSTR-номера, на которые есть ссылки
refs = collections.defaultdict(list)  # номер -> [источники]

def trigref(s):
    m = re.fullmatch(r'TRIGSTR_(\d+)', s)
    return int(m.group(1)) if m else None

# --- объекты
for fn, lv in [('w3u', False), ('w3a', True), ('w3t', False), ('w3h', False), ('w3b', False), ('w3q', True), ('w3d', False)]:
    d = rd('war3map.' + fn)
    if not d or len(d) < 12:
        continue
    try:
        ver, tabs = C.parse(d, lv)
    except Exception as e:
        print('не разобран', fn, e)
        continue
    for t in tabs:
        for o in t:
            for m in o.mods:
                v = m[4]
                if m[1] == 3 and isinstance(v, str) and v:
                    n = trigref(v)
                    if n is not None:
                        refs[n].append(f'{fn}:{o.id}:{m[0]}')
                    elif CYR.search(v):
                        add(fn, f'{o.id}:{m[0]}:{m[2]}', v)
                    else:
                        stat[fn + '_latin'] += 1

# --- war3map.j: литералы с кириллицей + ссылки на TRIGSTR
j = rd('war3map.j').decode('utf-8').replace('\r\n', '\n')
lit = re.compile(r'"((?:[^"\\\n]|\\.)*)"')
for ln, line in enumerate(j.split('\n'), 1):
    code = line.split('//')[0] if '//' in line and '"' not in line.split('//')[0][-1:] else line
    for m in lit.finditer(line):
        s = m.group(1)
        n = trigref(s)
        if n is not None:
            refs[n].append(f'j:{ln}')
        elif CYR.search(s):
            add('j', str(ln), s.replace('\\"', '"').replace('\\\\', '\\'))
for m in re.finditer(r'TRIGSTR_(\d+)', j):
    pass

# --- прочие текстовые файлы
for fn in ['war3mapSkin.txt', 'war3mapMisc.txt']:
    d = rd(fn)
    if d:
        for ln, line in enumerate(d.decode('utf-8-sig').replace('\r\n', '\n').split('\n'), 1):
            if '=' in line and not line.startswith('//'):
                k, v = line.split('=', 1)
                if CYR.search(v):
                    add(fn, f'{ln}:{k}', v)
                else:
                    n = None
                    for p in v.split(','):
                        if trigref(p.strip()) is not None:
                            refs[trigref(p.strip())].append(f'{fn}:{k}')

# w3i: имя карты, автор, описание, игроки, лоадскрин
d = rd('war3map.w3i')
for m in re.finditer(rb'TRIGSTR_(\d+)', d):
    refs[int(m.group(1))].append('w3i')

# wct/wtg: триггеры в wtg могут ссылаться на TRIGSTR
wtg = rd('war3map.wtg')
for m in re.finditer(rb'TRIGSTR_(\d+)', wtg or b''):
    refs[int(m.group(1))].append('wtg')

# --- wts: все строки, с источниками ссылок
for n in sorted(trig):
    srcs = ';'.join(sorted(set(refs.get(n, [])))[:6])
    add('wts', f'TRIGSTR_{n:03d}' + ('' if srcs else ' (нет ссылок)'), trig[n])
    stat['wts_noref'] += 0 if srcs else 1

# файлы, не разобранные: wct
wct = rd('war3map.wct')
print('wct байт:', len(wct), 'кириллица в wct:', len(CYR.findall(wct.decode('utf-8', 'ignore'))))

# --- дедупликация по тексту
by = collections.OrderedDict()
for src, key, text in entries:
    if not CYR.search(text) and not text.strip():
        continue
    by.setdefault(text, []).append(f'{src}:{key}')
rows = []
for i, (text, srcs) in enumerate(by.items(), 1):
    rows.append((f'S{i:04d}', '; '.join(srcs[:5]) + (f' (+{len(srcs) - 5})' if len(srcs) > 5 else ''), text))

esc = lambda s: s.replace('\\', '\\\\').replace('\t', '\\t').replace('\n', '\\n')
with open(os.path.join(OUT, 'strings.tsv'), 'w', encoding='utf-8') as f:
    f.write('id\tsources\tru\n')
    for i, s, t in rows:
        f.write(f'{i}\t{esc(s)}\t{esc(t)}\n')

print('записей до дедупа:', len(entries), 'уникальных текстов:', len(rows))
for k, v in sorted(stat.items()):
    print(' ', k, v)
cyr_rows = sum(1 for _, _, t in rows if CYR.search(t))
print('с кириллицей:', cyr_rows, 'без кириллицы:', len(rows) - cyr_rows)
