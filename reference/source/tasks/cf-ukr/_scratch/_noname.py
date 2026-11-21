import sys, re
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C
h = mb.open_archive(r'D:\WarcraftIII 1.26a\Maps\cf_ua\CastleFight_mod_v17_ua.w3x')
wts = mb.read(h, 'war3map.wts').decode('utf-8-sig').replace('\r\n', '\n')
trig = {int(m.group(1)): m.group(2) for m in re.finditer(r'STRING (\d+)\s*\n(?://[^\n]*\n)?\{\n(.*?)\n\}', wts, re.S)}
def res(v):
    m = re.fullmatch(r'TRIGSTR_(\d+)', v)
    return trig.get(int(m.group(1)), v) if m else v
for fn, lv, nf, tf in (('w3u', False, 'unam', ('utub', 'ubui')), ('w3a', True, 'anam', ('atp1', 'aub1')), ('w3t', False, 'unam', ('utub',))):
    d = mb.read(h, 'war3map.' + fn)
    ver, tabs = C.parse(d, lv)
    no = []
    nn = 0
    for t in tabs:
        for o in t:
            nn += 1
            if o.get(nf) is None and o.get('inam') is None:
                no.append(o.id + '<' + o.base)
    print(fn, 'объектов', nn, 'без своего имени', len(no))
    print('  ', ' '.join(no[:150]))
