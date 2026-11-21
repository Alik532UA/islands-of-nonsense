import re,sys,collections
sys.path.insert(0,'.')
import _tr
pairs,full=_tr.load()
rows=[l.rstrip('\n').split('\t') for l in open('out/strings.tsv',encoding='utf-8')][1:]
c=collections.Counter()
V=set()
for i,s,tt in rows:
    for w in re.findall(r"[А-Яа-яЁёІіЇїЄєҐґ'-]{2,}",re.sub(r'\|c[0-9a-fA-F]{8}|\|r|\|n',' ',tt)): V.add(w.lower())
for i,s,t in rows:
    if not _tr.CYR.search(t) or t in full: continue
    u=_tr.tr(t,pairs,full)
    for seg in _tr.TOK.split(u)[::2]:
        seg=seg.strip()
        ws=re.findall(r"[А-Яа-яЁёІіЇїЄєҐґ'-]{2,}",seg)
        if any(w.lower() not in _tr.ALLOW and w.lower() in V for w in ws): c[seg]+=1
lo=int(sys.argv[1]); hi=int(sys.argv[2])
print(len(c))
for seg,n in c.most_common()[lo:hi]: print(n,'|',seg[:170])
