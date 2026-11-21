# Выгрузка данных Castle Fight (мод) в JSON для веб-версии: расы, здания, юниты, предметы, константы.
# Запуск: python -X utf8 export_data.py <карта.w3x> <папка вывода>
# Читает карту через StormLib (make_base), объекты через cfobj, имена из war3map.wts, таблицу зданий из war3map.j.
import sys, re, json, os
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
import make_base as mb, cfobj as C

SRC = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

h = mb.open_archive(SRC)
_, ut = C.parse(mb.read(h, 'war3map.w3u'), False)
_, at = C.parse(mb.read(h, 'war3map.w3a'), True)
wts = mb.read(h, 'war3map.wts').decode('utf-8-sig', 'replace').replace('\r\n', '\n')
j = mb.read(h, 'war3map.j').decode('utf-8').replace('\r\n', '\n')
try:
    wti = mb.read(h, 'war3map.w3i')
except Exception:
    wti = b''
mb.dll.SFileCloseArchive(h)

# строки TRIGSTR_N и имена юнитов по id (из комментариев «// Units: id (имя), Name»)
STR, NAME_BY_ID = {}, {}
for m in re.finditer(r'STRING (\d+)\n(?://([^\n]*)\n)?\{\n(.*?)\n\}', wts, re.S):
    STR['TRIGSTR_%03d' % int(m.group(1))] = m.group(3)
    STR['TRIGSTR_%d' % int(m.group(1))] = m.group(3)
    cm = re.match(r'\s*Units: (\w{4}) \(.*\), Name ', m.group(2) or '')
    if cm:
        NAME_BY_ID[cm.group(1)] = m.group(3)


def clean(s):
    if s is None:
        return None
    s = STR.get(s, s)
    return re.sub(r'\|c\w{8}|\|r', '', str(s)).strip()


U = {o.id: o for t in ut for o in t}

# таблица зданий из JASS: call EC/RC/Wc/oC/IC... ('здание', цена, 'юнит', ...)
RACES = {'h00C': 'Люди', 'h00E': 'Наги', 'h00O': 'Хаос', 'h00P': 'Эльфы', 'h018': 'Нежить', 'h019': 'Орки',
         'h017': 'Север', 'u006': 'Порча', 'h089': 'Ночные эльфы', 'h06P': 'Техники'}
# раса, добавленная модом: строитель с id 'Cf01' (Сборщики); ищем по умениям строителя ниже


def stat(uid, f):
    return C.stat(U, uid, f)


spawn = {}   # здание -> (цена, юнит, предшественник|None, доп.цена цепочки)
for m in re.finditer(r"call (EC|RC)\('(\w{4})',(\d+),'(\w{4})',(\d+),'(\w{4})',([^\n]*)\)\n", j):
    f, b, cost, sp, extra, prev, rest = m.groups()
    spawn[b] = dict(building=b, gold=int(cost), unit=sp, upgrade_from=prev, upgrade_extra_cost=int(extra))
for m in re.finditer(r"call (?:Wc|oC)\('(\w{4})',(\d+),'(\w{4})',", j):
    b, cost, sp = m.groups()
    spawn.setdefault(b, dict(building=b, gold=int(cost), unit=sp, upgrade_from=None, upgrade_extra_cost=0))
# здания модуля Сборщиков: регистрация другим вызовом, добираем по построенным объектам cg*
for m in re.finditer(r"call \w+\('(cg\w\w)',(\d+),'(cg\w\w)'", j):
    spawn.setdefault(m.group(1), dict(building=m.group(1), gold=int(m.group(2)), unit=m.group(3), upgrade_from=None, upgrade_extra_cost=0))


def unit_row(uid):
    o = U.get(uid)
    nm = clean(o.get('unam')) if (o and o.get('unam')) else NAME_BY_ID.get(uid, uid)
    row = dict(id=uid, name=clean(nm))
    row['hp'] = stat(uid, 'uhpm')
    row['armor'] = stat(uid, 'udef')
    row['armor_type'] = stat(uid, 'udty')
    row['attack_type'] = stat(uid, 'ua1t')
    row['damage_base'] = stat(uid, 'ua1b')
    row['damage_dice'] = stat(uid, 'ua1d')
    row['damage_sides'] = stat(uid, 'ua1s')
    row['cooldown'] = stat(uid, 'ua1c')
    row['range'] = stat(uid, 'ua1r')
    row['move_type'] = stat(uid, 'umvt')
    row['flying'] = stat(uid, 'umvt') == 'fly'
    row['gold_cost'] = stat(uid, 'ugol')
    if o:
        row['raw_fields'] = {m[0]: clean(m[4]) if isinstance(m[4], str) else m[4] for m in o.mods}
    return row


buildings, units = {}, {}
for b, s in spawn.items():
    br = unit_row(b)
    br.update(s)
    buildings[b] = br
    units.setdefault(s['unit'], unit_row(s['unit']))

# расы: строитель -> список зданий (ubui)
races = []
for bid, rn in RACES.items():
    if bid in U:
        bl = [x for x in (U[bid].get('ubui') or '').split(',') if x]
        races.append(dict(race=rn, builder=bid, buildings=bl))
# раса Сборщики добавлена модом (здания cg0*), строитель в списке рас оригинала отсутствует
sb = [b for b in buildings if b.startswith('cg0')]
if sb:
    races.append(dict(race='Сборщики', builder='(модовый строитель)', buildings=sb))
# раса каждого здания: по списку строителя, апгрейды наследуют расу предшественника
race_of = {b: r['race'] for r in races for b in r['buildings']}
for _ in range(5):
    for b, d in buildings.items():
        if b not in race_of and d.get('upgrade_from') in race_of:
            race_of[b] = race_of[d['upgrade_from']]
for b, d in buildings.items():
    d['race'] = race_of.get(b)
for u in units.values():
    o = U.get(u['id'])
    u['base_unit'] = o.base if o else u['id']
json.dump(races, open(os.path.join(OUT, 'races.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(list(buildings.values()), open(os.path.join(OUT, 'buildings.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(list(units.values()), open(os.path.join(OUT, 'units.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# предметы (w3t не разбираем: берём из JASS цены и id)
items = []
for m in re.finditer(r"GetItemTypeId\(GetManipulatedItem\(\)\)=='(I\w\w\w)'", j):
    if m.group(1) not in [i['id'] for i in items]:
        items.append(dict(id=m.group(1)))
json.dump(items, open(os.path.join(OUT, 'items_ids.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# константы из JASS
consts = {}
for k in ('Dx', 'ea', 'To', 'Ve', 'Wv', 'ie', 'ie'):
    m = re.search(r'\bset %s=([\-\d\.]+)' % k, j) or re.search(r'\b(?:integer|real) %s=([\-\d\.]+)' % k, j)
    if m:
        consts[k] = m.group(1)
json.dump(consts, open(os.path.join(OUT, 'jass_constants.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('зданий', len(buildings), 'юнитов', len(units), 'рас', len(races), 'строк wts', len(STR) // 2)
