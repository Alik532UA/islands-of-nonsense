import sys
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
import make_base as mb
h = mb.open_archive(r'D:\WarcraftIII 1.26a\Maps\cf\CastleFight_mod_v16.w3x')
for n in ['(listfile)', 'war3map.wts', 'war3map.j', 'war3map.w3u', 'war3map.w3a', 'war3map.w3t', 'war3map.w3h', 'war3map.w3b', 'war3map.w3d', 'war3map.w3q', 'war3map.w3i', 'war3map.w3s', 'war3map.w3c', 'war3map.w3r', 'war3map.doo', 'war3mapSkin.txt', 'war3map.wct', 'war3mapMisc.txt', 'war3mapExtra.txt', 'war3map.shd', 'war3mapUnits.doo', 'war3map.imp']:
    d = mb.read(h, n)
    print(n, None if d is None else len(d))
lf = mb.read(h, '(listfile)')
if lf:
    print(lf.decode('latin1')[:3000])
