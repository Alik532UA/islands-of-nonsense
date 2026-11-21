# Скан готовой карты на русские слова: путь карты аргументом
import re, sys, collections
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
sys.path.insert(0, r'D:\Создание карты Warcraft\castle-fight')
import make_base as mb
import cfobj as C
path = sys.argv[1]
h = mb.open_archive(path)
RUL = re.compile('[ыэёъЫЭЁЪ]')
CYR = re.compile('[А-Яа-яЁёІіЇїЄєҐґ]')
RU_WORDS = re.compile(r'\b(что|это|как|или|если|когда|только|всех|всем|может|урона|урон|юнитов|юнита|юнит|здание|здания|зданий|башни|атакует|получает|наносит|противника|врагов|враги|своей|этого|этой|будет|после|между|нельзя|игрока|раунда|секунды|жизни|здоровья|цели|союзники|вражеских|уменьшает|увеличивает|построить|улучшить|тренерует|сейчас|следующий|цена|каждый|который|вокруг|одного|такой|очень|всегда|время|вашей|ваших|вы|ваш|нет|уже|даёт|шанс)\b', re.I)
found = collections.defaultdict(list)


def chk(src, s):
    if not CYR.search(s):
        return
    t = re.sub(r'\|c[0-9a-fA-F]{8}|\|[rRn]', ' ', s)
    if RUL.search(t):
        found['ыэёъ'].append((src, s[:80]))
    m = [x for x in RU_WORDS.findall(t) if x.lower() not in ('шанс', 'для', 'при', 'без', 'над', 'вас', 'ваш', 'уже', 'ваша', 'один', 'одного', 'золота', 'союзники', 'вы')]
    if m:
        found['слова'].append((src, m[:3], s[:80]))


wts = mb.read(h, 'war3map.wts').decode('utf-8-sig')
for m in re.finditer(r'STRING (\d+)\s*\n(?://[^\n]*\n)?\{\r?\n(.*?)\r?\n\}', wts, re.S):
    chk('wts' + m.group(1), m.group(2))
j = mb.read(h, 'war3map.j').decode('utf-8')
for n, line in enumerate(j.replace('\r\n', '\n').split('\n'), 1):
    for m in re.finditer(r'"((?:[^"\\\n]|\\.)*)"', line):
        chk('j%d' % n, m.group(1))
for fn, lv in (('w3u', False), ('w3a', True), ('w3t', False), ('w3h', False), ('w3b', False)):
    d = mb.read(h, 'war3map.' + fn)
    ver, tabs = C.parse(d, lv)
    for t in tabs:
        for o in t:
            for m in o.mods:
                if m[1] == 3 and isinstance(m[4], str):
                    chk(fn + ':' + o.id + ':' + m[0], m[4])
for fn in ('war3mapSkin.txt', 'war3mapMisc.txt'):
    d = mb.read(h, fn)
    if d:
        for ln in d.decode('utf-8-sig').split('\n'):
            chk(fn, ln)
# w3i (название карты, описание)
d = mb.read(h, 'war3map.w3i')
print('w3i кириллица:', CYR.findall(d.decode('utf-8', 'ignore'))[:20])
for k, v in found.items():
    print(k, len(v))
    for x in v[:15]:
        print('  ', x)
