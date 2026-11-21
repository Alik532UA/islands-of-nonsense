# Движок перевода: словари имён и фраз (подстановка, длинные первыми) + ручные полные переводы
import re, sys, os, collections, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))
CYR = re.compile('[А-Яа-яЁё]')

def load():
    import glob
    pairs, full = [], {}
    for f in sorted(glob.glob(os.path.join(HERE, '_dict_*.py'))):
        m = importlib.import_module(os.path.basename(f)[:-3])
        importlib.reload(m)
        pairs += m.PAIRS
        full.update(getattr(m, 'FULL', {}))
        CHUNK.update(getattr(m, 'CHUNK', {}))
    import json
    items = json.load(open(os.path.join(HERE, 'out', 'rest_chunks_v1.json'), encoding='utf-8'))
    for f in sorted(glob.glob(os.path.join(HERE, 'out', 'tr_*.txt'))):
        for ln in open(f, encoding='utf-8'):
            ln = ln.rstrip(chr(10))
            if '|' not in ln:
                continue
            k, v = ln.split('|', 1)
            o = items[int(k)]
            lead = o[:len(o) - len(o.lstrip())]
            trail = o[len(o.rstrip()):]
            CHUNK[o] = lead + v.strip().replace('ʼ', "'") + trail
    pairs.sort(key=lambda p: -len(p[0]))
    return pairs, full

ALLOW = set(open(os.path.join(HERE,'_allow.txt'),encoding='utf-8').read().split()) if os.path.exists(os.path.join(HERE,'_allow.txt')) else set()

FORGE = [('Кузница: ', 'Кузня: '), ('+% урона', '+% шкоди'), ('% урона', '% шкоди'), (' из ', ' з '), ('экономика, доход +', 'економіка, дохід +'), ('экономика', 'економіка'), ('к доходу', 'до доходу'), ('броня +', 'броня +'), (' брони ', ' броні '), (': максимум', ': максимум'), (' золота', ' золота')]

TOK = re.compile(r'(\|c[0-9a-fA-F]{8}|\|r|\|n)')
CHUNK = {}

def unesc(s):
    return s.replace('\\n', '\n').replace('\\t', '\t').replace('\\\\', '\\')

def tr(text, pairs, full):
    if text in full:
        return full[text]
    if text.startswith('Кузница: '):
        for a, b in FORGE:
            text = text.replace(a, b)
        return text
    parts = TOK.split(text)
    for k in range(0, len(parts), 2):
        c = parts[k]
        if c in CHUNK:
            parts[k] = CHUNK[c]
            continue
        for a, b in pairs:
            c = c.replace(a, b)
        parts[k] = c
    return re.sub(r'(\d)(шкоди|секунди)', r'\1 \2', ''.join(parts))

if __name__ == '__main__':
    pairs, full = load()
    rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'out', 'strings.tsv'), encoding='utf-8')][1:]
    left = []
    for i, s, t in rows:
        if not CYR.search(t):
            continue
        u = tr(t, pairs, full)
        left.append((i, t, u))
    c = collections.Counter()
    for i, t0, u in left:
        clean = re.sub(r'\|c[0-9a-fA-F]{8}|\|r|\|n', ' ', u)
        for w in re.findall(r"[А-Яа-яЁёІіЇїЄєҐґ'-]{2,}", clean):
            if w.lower() not in ALLOW:
                c[w.lower()] += 1
    print('строк с остатками:', len(left))
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    print(' '.join(f'{w}:{k}' for w, k in c.most_common(n)))
