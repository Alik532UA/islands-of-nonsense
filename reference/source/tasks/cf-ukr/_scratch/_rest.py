import re,sys,collections,json
sys.path.insert(0,'.')
import _tr
pairs,full=_tr.load()
rows=[l.rstrip('\n').split('\t') for l in open('out/strings.tsv',encoding='utf-8')][1:]
V=set()
for i,s,tt in rows:
    for w in re.findall(r"[А-Яа-яЁёІіЇїЄєҐґ'-]{2,}",_tr.TOK.sub(' ',tt)): V.add(w.lower())
orig=collections.OrderedDict()
for i,s,t in rows:
    if not _tr.CYR.search(t) or t in full or t.startswith('Кузница: '): continue
    for ch in _tr.TOK.split(t)[::2]:
        if ch in _tr.CHUNK: continue
        u=ch
        for a,b in pairs: u=u.replace(a,b)
        ws=re.findall(r"[А-Яа-яЁёІіЇїЄєҐґ'-]{2,}",u)
        if any(w.lower() in V and w.lower() not in _tr.ALLOW for w in ws): orig[ch]=orig.get(ch,0)+1
items=[c for c in orig if c.strip(' -')]
print(len(items), sum(len(c) for c in items))
json.dump(items,open('out/rest_chunks.json','w',encoding='utf-8'),ensure_ascii=False)
