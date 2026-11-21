# Сборка Castle Fight с правками (этапы 1-3 из ПЛАН.md).
# Оригинал не трогаем: читаем его, правим war3map.j / w3u / w3a в памяти и пишем в копию Maps\cf\CastleFight_mod_vN.w3x
import os, sys, re, json, math, shutil, struct, subprocess
sys.path.insert(0, r'D:\Создание карты Warcraft\wc3-td\build')
import make_base as mb
import gen
import cfobj as C
import analyze as AN
import bot_ai as BOT
import skills_jass as SJ
import race_sbor as RS
import race_sbor_jass as RSJ

SRC = r'D:\WarcraftIII 1.26a\Maps\Download\Castle_Fight_1.17.w3x'
VER = sys.argv[1] if len(sys.argv) > 1 else '1'
OUTD = r'D:\WarcraftIII 1.26a\Maps\cf'
# пробная сборка для партии владельца: версия вида 33log, пишет лог ботов в Logs\cfbot.txt, лежит в Maps\cf_test (в Maps\cf одна карта)
PROBE = VER.endswith('log') and not VER.startswith('test')
if PROBE:
    OUTD = r'D:\WarcraftIII 1.26a\Maps\cf_test'
OUT = os.path.join(OUTD, f'CastleFight_mod_v{VER}.w3x')
HERE = os.path.dirname(os.path.abspath(__file__))
TD = r'D:\Создание карты Warcraft\wc3-td\build'
LOG = []

h = mb.open_archive(SRC)
j = mb.read(h, 'war3map.j').decode('utf-8').replace('\r\n', '\n')
uver, utabs = C.parse(mb.read(h, 'war3map.w3u'), False)
aver, atabs = C.parse(mb.read(h, 'war3map.w3a'), True)
tver, ttabs = C.parse(mb.read(h, 'war3map.w3t'), False)
mb.dll.SFileCloseArchive(h)
U = {o.id: o for t in utabs for o in t}
A = {o.id: o for t in atabs for o in t}


def patch(a, b, cnt=1):
    global j
    assert j.count(a) == cnt, (j.count(a), a[:80])
    j = j.replace(a, b)


def icon(*names):
    for n in names:
        try:
            return gen.icon(n)
        except AssertionError:
            pass
    raise SystemExit(f'нет иконок {names}')


# v25: раса «Сборщики» (11-я). Объекты и регистрация в скрипте создаются ДО баланса: она входит в таблицу силы и выравнивается как все.
AN.RACES[RS.BUILDER] = RS.NAME
RS.add_objects(U, utabs, C, icon)
for _old, _new in RS.script_patches():
    patch(_old, _new)

# =====================================================================
# Этап 2. Баланс объектов
# =====================================================================
rows = AN.table(U, j)
vals = {}
for r in rows:
    if r['val']:
        vals.setdefault(r['race'], []).append(r['val'])
race_avg = {k: sum(v) / len(v) for k, v in vals.items()}
avg = sum(race_avg.values()) / len(race_avg)

hp_mul = {}   # юнит -> множитель здоровья (накапливаем, применяем один раз)
dmg_mul = {}
def mul(d, u, k):
    d[u] = d.get(u, 1.0) * k

# 2.1 выравнивание рас: закрываем ~60% разрыва силы через здоровье (сила ~ корень из здоровья)
for r in rows:
    c = 1 + 0.6 * (avg / race_avg[r['race']] - 1)
    hp_mul.setdefault(r['u'], max(0.8, min(1.25, c * c)))
# 2.2 одиночные выбросы внутри рас (кроме смертников и осады)
for r in rows:
    if r['val'] and r['rng'] and r['rng'] < 900:
        rel = r['val'] * math.sqrt(hp_mul[r['u']]) / avg
        # слабых по формуле не тянем: это маги, их сила в заклинаниях, а не в уроне
        if rel > 1.4:
            mul(hp_mul, r['u'], (1.4 / rel) ** 2)
# 2.3 летающие: -15% здоровья, их здания +10% цены
fly_b = set()
for r in rows:
    if r['fly']:
        mul(hp_mul, r['u'], 0.85)
        fly_b.add(r['b'])
# 2.4 осада (дальность от 900): +40% здоровья, +20% урона
for r in rows:
    if r['rng'] and r['rng'] >= 900:
        mul(hp_mul, r['u'], 1.4)
        mul(dmg_mul, r['u'], 1.2)

for u, k in hp_mul.items():
    k = max(0.65, min(1.45, k))
    hp = C.stat(U, u, 'uhpm')
    if hp and abs(k - 1) > 0.02 and u in U:
        U[u].set('uhpm', int(round(hp * k / 5) * 5), 0)
        LOG.append(f'здоровье {AN.name(U, u)}: {hp} -> {U[u].get("uhpm")}')
for u, k in dmg_mul.items():
    d = C.stat(U, u, 'ua1b')
    if d is not None and u in U:
        U[u].set('ua1b', int(round(d * k)), 0)
        LOG.append(f'урон {AN.name(U, u)}: {d} -> {U[u].get("ua1b")}')
# тексты Сборщиков берут итоговые цифры (после баланса); таблица перевода для UA пишется в race_sbor_ua.json
RS.finalize_text(U, C)

# 2.5 цены: улучшение не дешевле 60% предыдущего здания, летающие +10%
spawn, prev = {}, {}
for m in re.finditer(r"call (\w+)\('(\w{4})',(\d+),'(\w{4})',([^\n]*)\)\n", j):
    if m.group(1) == 'EC' or (m.group(1) == 'RC' and m.group(2).startswith('cg')):   # RC у оригинала (h04P) не трогаем: баланс старых рас прежний
        pm = re.match(r"\d+,'(\w{4})'", m.group(5))
        if pm:
            prev[m.group(2)] = pm.group(1)
new_cost = {}
for r in rows:
    b = r['b']
    g = C.stat(U, b, 'ugol') or 0
    ng = g
    if b in prev:
        pg = C.stat(U, prev[b], 'ugol') or 0
        ng = max(ng, int(round(pg * 0.6 / 5) * 5))
    if b in fly_b:
        ng = int(round(ng * 1.1 / 5) * 5)
    if ng != g and b in U:
        U[b].set('ugol', ng, 0)
        new_cost[b] = ng
        LOG.append(f'цена {AN.name(U, b)}: {g} -> {ng}')
# в скрипте у каждого здания своя копия цены (из неё считается доход) - синхронизируем
for b, ng in new_cost.items():
    j, n = re.subn(r"(call \w+\('" + b + r"',)\d+,", r"\g<1>" + str(ng) + ",", j)
    assert n == 1, (b, n)
    # цена прошлого здания в строке улучшения Сборщиков (из неё считается доход): тоже обновляем (Ангар +10% -> Штурмовой ангар)
    j = re.sub(r"(call (?:EC|RC)\('cg\w\w',\d+,'\w{4}',)\d+(,'" + b + r"')", r"\g<1>" + str(ng) + r"\g<2>", j)

# 2.6 Техникам второй юнит против воздуха: Лёгкий танк бьёт и по воздуху
tank = next(r['u'] for r in rows if r['b'] == 'h05X')
tg = str(C.stat(U, tank, 'ua1g'))
if 'air' not in tg:
    U[tank].set('ua1g', tg + ',air', 3)
    LOG.append(f'{AN.name(U, tank)} теперь бьёт по воздуху')
# цепная атака Ведьмака (h00U) перескакивала на здания и била сквозь замок по башням за ним: здания из целей отскока убраны
U['h00U'].set('ua1p', 'air,debris,ground,item,ward', 3)

# =====================================================================
# Этап 3. Новые объекты: кузница, умения рас, страж центра
# =====================================================================
assert not [k for k in list(U) + list(A) if k[:2] in ('Cf', 'Cr', 'Cb', 'Cs', 'Ci')], 'ID заняты'
RACES = [('h00C', 'Люди'), ('h00E', 'Наги'), ('h00O', 'Хаос'), ('h00P', 'Эльфы'), ('h018', 'Нежить'),
         ('h019', 'Орки'), ('h017', 'Север'), ('u006', 'Порча'), ('h089', 'Ночные эльфы'), ('h06P', 'Техники'), (RS.BUILDER, RS.NAME)]
# умение расы: (название, иконка, тип цели 0 нет / 2 точка, вид, параметры, описание)
SKILL = {
    'Люди': ('Знамя', ('CallToArms',), 0, 'dmg', 15, '+25% урона всем твоим бойцам на 15 с.'),
    'Наги': ('Прилив', ('Slow', 'MurlocNightCrawler'), 0, 'slow', 8, 'Все враги движутся вдвое медленнее 8 с.'),
    'Нежить': ('Чума', ('PlagueCloud', 'DeathAndDecay'), 0, 'plague', 10, 'Все враги теряют 10% здоровья.'),
    'Орки': ('Боевой клич', ('Bloodlust',), 0, 'as', 12, '+30% скорости атаки всем твоим бойцам на 12 с.'),
    'Ночные эльфы': ('Танец теней', ('Evasion', 'Invisibility'), 0, 'evade', 8, 'Твои бойцы уклоняются от 40% атак врага 8 с.'),
    'Техники': ('Мина', ('GoblinLandMine', 'ChestOfGold'), 0, 'mine', (1400, 300), 'Взрыв в центре карты: 300 урона всем врагам в радиусе 1400.'),
    'Хаос': ('Огненный дождь', ('FireRocks',), 2, 'nuke', (200, 400), '200 урона врагам в области (радиус 400).'),
    'Эльфы': ('Град стрел', ('Starfall',), 2, 'nuke', (150, 450), '150 урона врагам в области (радиус 450).'),
    'Север': ('Ледяной щит', ('FrostArmor', 'Blizzard'), 0, 'shield', 10, '+5 брони всем твоим бойцам на 10 с.'),
    'Порча': ('Заражение', ('DeathAndDecay',), 2, 'infect', (30, 380), 'Враги в области получают по 30 урона в секунду 8 с и заражают соседей.'),
    # заглушка этапа 3: на этапе 4 заменяется умением «Великая сборка» с обломками
    RS.NAME: (RS.SKILL[0], ('EngineeringUpgrade', 'Bloodlust'), 0, 'sbor', 12, RS.SKILL[2]),
}
# умения открываются на 5-й минуте (CF_T = время игры в секундах)
UNLOCK = 300
CD = 150


def ab_from(blob):
    return C.parse(struct.pack('<iii', 2, 0, 1) + blob, True)[1][1][0]


new_abs = []
# Кузница (v16): каждый раунд с нуля. Атака +8% от базового урона бойца за уровень, броня +1, экономика +10% (3 ур.).
# Уровни 3-5 дают союзникам половину бонуса (лучший из союзников, не складываются).
# Атака в процентах: при сборке считаем средний урон удара каждого бойца, в игре выдаём одноуровневую AIat
# на нужное число урона (Cw01..Cw99, Cx00..). Многоуровневая AIde/AIat роняла 1.26, одноуровневые работают.
# Броня: готовые AId1..AId5, AId7 (+6 = AId5 + AId1).
FORGE_PRICE = {0: lambda L: 200 + 100 * L, 1: lambda L: 150 + 75 * L, 2: lambda L: 150 + 100 * L}
FORGE_MAX = {0: 5, 1: 5, 2: 3}
BASE_DMG = {}
for r in rows:
    u = r['u']
    if not r['dps'] or u in BASE_DMG:
        continue
    b = C.stat(U, u, 'ua1b') or 0
    d = C.stat(U, u, 'ua1d') or 0
    s = C.stat(U, u, 'ua1s') or 0
    BASE_DMG[u] = max(1, int(round(b + d * (s + 1) / 2)))
QMAX = max(1, int(math.ceil(max(BASE_DMG.values()) * 0.84)) + 1)
assert QMAX < 200, QMAX
def qid(v):
    return ('Cw%02d' % v) if v < 100 else ('Cx%02d' % (v - 100))
for v in range(1, QMAX + 1):
    mods = [gen.amod('anam', f'Кузница: атака +{v}'), gen.amod('Iatt', v, 1)]
    new_abs.append(ab_from(b'AIat' + qid(v).encode() + struct.pack('<i', len(mods)) + b''.join(mods)))
print('кузница: урон бойцов', min(BASE_DMG.values()), '-', max(BASE_DMG.values()), 'способностей атаки', QMAX)
FORGE = [('Cf01', 'Кузница: атака', 'SteelMelee', 'berserk'),
         ('Cf02', 'Кузница: броня', 'HumanArmorUpOne', 'cripple'),
         ('Cf03', 'Кузница: экономика', 'ChestOfGold', 'curse')]
# Кнопки прямо на строителе, без книги заклинаний (книга роняла 1.26).
# Занято у строителя: Move 0,0 / Stop 1,0 / Hold 2,0 / Patrol 0,1 / Repair 1,1 / Build 0,2 / Blink 1,2 / A005 3,2.
# Свободно: 2,1 / 3,1 / 2,2 и 3,0 (атаки у строителя нет).
FORGE_POS = [(2, 1), (3, 1), (2, 2)]
RACE_POS = (3, 0)
# Кнопка показывает только следующий шаг: уровень кнопки = купленный уровень + 1, последний уровень = максимум.
FORGE_STEP = [(8, '% урона'), (1, ' брони'), (10, '% к доходу')]
TEAM_NOTE = ' С 3-го уровня союзники получают половину бонуса.'
for i, (aid, nm, ico, order) in enumerate(FORGE):
    per, unit_s = FORGE_STEP[i]
    mx, cost = FORGE_MAX[i], FORGE_PRICE[i]
    who = '' if i == 2 else ' всем твоим новым бойцам'
    names, tips = [], []
    for L in range(mx):
        names.append(f'{nm} +{per * (L + 1)}{unit_s} ({L + 1} из {mx}) - {cost(L)} золота')
        tips.append(f'Сейчас: +{per * L}{unit_s} ({L} из {mx}). Следующий уровень: +{per * (L + 1)}{unit_s}{who}. '
                    f'Цена {cost(L)} золота. Командир Алик (-50%): {int(cost(L) * 0.5 + 0.5)} золота. Сбрасывается в начале каждого раунда.' + ('' if i == 2 else TEAM_NOTE))
    names.append(f'{nm}: максимум ({mx} из {mx})')
    tips.append(f'Прокачано полностью: +{per * mx}{unit_s}{who}. Сбрасывается в начале каждого раунда.')
    raw = gen.channel(aid, nm, tips, ico, 0, 1, 0, order, *FORGE_POS[i])
    for L in range(1, mx + 2):
        old = f'{nm} (рівень {L})'.encode() + b'\0'
        assert raw.count(old) == 1, old
        raw = raw.replace(old, names[L - 1].encode() + b'\0')
    new_abs.append(ab_from(raw))
summon_unit = {}


# приказ умения расы: 'innerfire' движок принимает только с целью-юнитом, поэтому
# умения по точке (Хаос, Эльфы, Порча) с ним не кастовались; для точки берём 'blizzard'
def race_order(tt):
    return 'blizzard' if tt == 2 else 'innerfire'


TESTU = next(r['u'] for r in rows if r['dps'] and not r['fly'])
for ri, (bid, rn) in enumerate(RACES):
    nm, ico, tt, kind, par, tip = SKILL[rn]
    aid = 'Cr%02d' % ri
    new_abs.append(ab_from(gen.channel(aid, nm, [tip + f' Перезарядка {CD} с.'], icon(*ico)[len('ReplaceableTextures\\CommandButtons\\BTN'):-4],
                                      tt, CD, par[1] if kind in ('nuke', 'infect') else 0, race_order(tt), *RACE_POS)))
    U[bid].set('uabi', U[bid].get('uabi') + ',Cf01,Cf02,Cf03,' + aid, 3)
# баффы умений рас (одноуровневые способности): урон по ступеням, скорость атаки
DMG_TIERS = [3, 5, 8, 12, 18, 28]
for ti, val in enumerate(DMG_TIERS):
    mods = [gen.amod('anam', 'Знамя %d' % (ti + 1)), gen.amod('Iatt', val, 1)]
    new_abs.append(ab_from(b'AIat' + ('Cbd%d' % (ti + 1)).encode() + struct.pack('<i', len(mods)) + b''.join(mods)))
mods = [gen.amod('anam', 'Боевой клич'), gen.amod('Isx1', 0.3, 1)]
new_abs.append(ab_from(b'AIsx' + b'Cbs1' + struct.pack('<i', len(mods)) + b''.join(mods)))
mods = [gen.amod('anam', 'Танец теней'), gen.amod('Eev1', 0.4, 1)]
new_abs.append(ab_from(b'AIev' + b'Cbe1' + struct.pack('<i', len(mods)) + b''.join(mods)))
# командир Дэн: +24% скорости атаки бойцам (одна общая одноуровневая способность)
assert 'Cc01' not in A and 'Cc01' not in U, 'ID Cc01 занят'
mods = [gen.amod('anam', 'Командир Дэн'), gen.amod('Isx1', 0.24, 1)]
new_abs.append(ab_from(b'AIsx' + b'Cc01' + struct.pack('<i', len(mods)) + b''.join(mods)))
# командир Леша: 20% шанс уклониться (Cc02), командир Юра: 25% шанс критического удара x2 (Cc03), одноуровневые способности
for _aid in ('Cc02', 'Cc03'):
    assert _aid not in A and _aid not in U, 'ID ' + _aid + ' занят'
mods = [gen.amod('anam', 'Командир Леша'), gen.amod('Eev1', 0.20, 1)]
new_abs.append(ab_from(b'AIev' + b'Cc02' + struct.pack('<i', len(mods)) + b''.join(mods)))
mods = [gen.amod('anam', 'Командир Юра'), gen.amod('Ocr1', 25, 1), gen.amod('Ocr2', 2.0, 1), gen.amod('Ocr3', 0, 1)]
new_abs.append(ab_from(b'AIcs' + b'Cc03' + struct.pack('<i', len(mods)) + b''.join(mods)))
# раса Сборщики, обломки: Cgb1 +10% и Cgb2 +20% скорости атаки (см. race_sbor_jass.py)
for _aid, _val, _nm in (('Cgb1', RSJ.BONUS_NORMAL, 'Обломки'), ('Cgb2', RSJ.BONUS_GREAT, 'Великая сборка')):
    assert _aid not in A and _aid not in U, 'ID ' + _aid + ' занят'
    mods = [gen.amod('anam', _nm), gen.amod('Isx1', _val, 1)]
    new_abs.append(ab_from(b'AIsx' + _aid.encode() + struct.pack('<i', len(mods)) + b''.join(mods)))
# v29 улучшения Сборщиков: Мортира (Cgc1) критический удар, Штурмовик (Cgc2) уклонение; поля как у командиров Юры и Леши (крит в процентах, уклонение долями)
for _aid in ('Cgc1', 'Cgc2'):
    assert _aid not in A and _aid not in U, 'ID ' + _aid + ' занят'
mods = [gen.amod('anam', 'Фугасный снаряд'), gen.amod('Ocr1', RS.UP_CRIT_PCT, 1), gen.amod('Ocr2', RS.UP_CRIT_MUL, 1), gen.amod('Ocr3', 0, 1)]
new_abs.append(ab_from(b'AIcs' + b'Cgc1' + struct.pack('<i', len(mods)) + b''.join(mods)))
mods = [gen.amod('anam', 'Манёвр'), gen.amod('Eev1', RS.UP_EVADE_PCT / 100.0, 1)]
new_abs.append(ab_from(b'AIev' + b'Cgc2' + struct.pack('<i', len(mods)) + b''.join(mods)))

# Предметы замка v24, продаются любой расе: Свиток Слабости (I00E, 300) и Лазурный купол (I00F, 900).
# Применяются без цели строителем, действуют вокруг него (как Свиток Камня, но без выбора точки).
# Свиток: враги-бойцы в радиусе ITEM_WK_R: атака -40% (одноуровневая AIsx Ci03), бег -25%, ITEM_WK_T с.
# Купол: здания команды (включая замок) в радиусе ITEM_DM_R неуязвимы ITEM_DM_T с.
ITEM_WK_R, ITEM_WK_T = 1400, 15
ITEM_DM_R, ITEM_DM_T = 1500, 6
assert not [o.id for t in ttabs for o in t if o.id in ('I00E', 'I00F')], 'ID предметов заняты'
mods = [gen.amod('anam', 'Слабость'), gen.amod('Isx1', -0.4, 1)]
new_abs.append(ab_from(b'AIsx' + b'Ci03' + struct.pack('<i', len(mods)) + b''.join(mods)))
# id предмета, умение, название, цена, иконки, приказ, запас max, задержка первого запаса, пополнение, описание
ITEMS = [
    ('I00E', 'Ci01', 'Свиток Слабости', 300, ('Cripple', 'Curse', 'Slow'), 'faeriefire', 2, 60, 150,
     f'Все вражеские бойцы в радиусе {ITEM_WK_R} вокруг строителя на {ITEM_WK_T} с: скорость атаки -40%, скорость бега -25%. '
     'Не лечит и не защищает здания, не задевает тех, кто вне круга. Дёшево: пускайте против толпы у ворот.'),
    ('I00F', 'Ci02', 'Лазурный купол', 900, ('Invulnerable', 'AntiMagicShell'), 'tranquility', 1, 150, 300,
     f'Все здания команды (включая замок) в радиусе {ITEM_DM_R} вокруг строителя неуязвимы {ITEM_DM_T} с. Бойцы продолжают драться. '
     'Не лечит и не помогает бойцам, бесполезен, пока враг не давит. Спасает замок на грани.'),
]
for iid, aid, nm, gold, ico, order, stock, start, regen, desc in ITEMS:
    ip = icon(*ico)
    new_abs.append(ab_from(gen.channel(aid, nm, [desc], ip[len('ReplaceableTextures\\CommandButtons\\BTN'):-4], 0, 1, 0, order, 0, 0)))
    ttabs[1].append(C.Obj('sres', iid, [
        ['unam', 3, 0, 0, nm], ['ides', 3, 0, 0, desc], ['utub', 3, 0, 0, desc],
        ['utip', 3, 0, 0, f'Купить {nm}'], ['igol', 0, 0, 0, gold],
        ['iabi', 3, 0, 0, aid], ['icid', 3, 0, 0, aid], ['iico', 3, 0, 0, ip],
        ['isto', 0, 0, 0, stock], ['isst', 0, 0, 0, start], ['istr', 0, 0, 0, regen]]))
# продаются в замке (umki) и у нейтрального торговца n00U (usei)
U['hcas'].set('umki', U['hcas'].get('umki') + ',I00E,I00F', 3)
U['n00U'].set('usei', U['n00U'].get('usei') + ',I00E,I00F', 3)

# дальнобойные: артиллерия (artillery/aline) стреляет в точку на земле, и убежавший юнит не получает урона.
# Переводим на самонаводящийся снаряд с уроном по области: msplash летит за целью, сплэш сохраняется.
C.SLK_MAP.update({'ua1w': ('W', 'weapTp1'), 'ua2w': ('W', 'weapTp2')})
ART_FIX = {'artillery': 'msplash', 'aline': 'mline'}
ART_UNITS = []
for r in rows:
    u = r['u']
    en = C.stat(U, u, 'uaen') or 0
    for k, wf in ((1, 'ua1w'), (2, 'ua2w')):
        w = C.stat(U, u, wf)
        if en & k and w in ART_FIX:
            ART_UNITS.append(u)
            if os.environ.get('CF_NOART'):  # только для сравнительного теста «как было»
                continue
            if u not in U:
                # стандартный юнит игры без правок в карте: заводим запись в таблице изменённых стандартных
                U[u] = C.Obj(u, '\0\0\0\0', [])
                utabs[0].append(U[u])
            U[u].set(wf, ART_FIX[w], 3)
print('артиллерия на самонаведение:', sorted(set(ART_UNITS)))
assert ART_UNITS, 'не нашли артиллерию'
atabs[1].extend(new_abs)

# страж центра
# боссы: каждые 3 минуты в центре появляется один из героев Варкрафта (модель героя на простой основе пехотинца)
# (имя, модель, здоровье, урон, броня, масштаб)
BOSSES = [
    ('Утер Светоносный', r'units\human\Uther\Uther.mdl', 2800, 55, 6, 1.0),
    ('Джайна Праудмур', r'units\human\HeroArchMage\HeroArchMage.mdl', 2000, 85, 2, 1.0),
    ('Мурадин Бронзобород', r'units\human\HeroMountainKing\HeroMountainKing.mdl', 3000, 50, 8, 1.0),
    ('Кель\'Тас Солнечный Скиталец', r'units\human\Kael\Kael.mdl', 2200, 75, 3, 1.0),
    ('Тралл', r'units\orc\HeroFarSeer\HeroFarSeer.mdl', 2400, 70, 4, 1.0),
    ('Кэрн Кровавое Копыто', r'units\orc\HeroTaurenChieftain\HeroTaurenChieftain.mdl', 3000, 60, 6, 1.0),
    ('Артас Менетил', r'units\human\Arthas\Arthas.mdl', 2600, 70, 6, 1.0),
    ('Кел\'Тузад', r'units\undead\Kelthuzad\Kelthuzad.mdl', 2000, 90, 2, 1.0),
    ('Малганис', r'units\undead\HeroDreadLord\HeroDreadLord.mdl', 2700, 65, 5, 1.0),
    ('Малфурион Ярость Бури', r'units\nightelf\HeroKeeperOfTheGrove\HeroKeeperOfTheGrove.mdl', 2500, 65, 4, 1.0),
    ('Тиранда Шелест Ветра', r'units\nightelf\HeroMoonPriestess\HeroMoonPriestess.mdl', 2100, 80, 3, 1.0),
    ('Иллидан Ярость Бури', r'units\nightelf\HeroDemonHunter\HeroDemonHunter.mdl', 2400, 80, 4, 1.0),
    ('Маннорот', r'units\demon\Pitlord\Pitlord.mdl', 3000, 70, 7, 1.0),
]
BOSS_IDS = []
for bi, (bn, bm, bhp, bdm, bar, bsc) in enumerate(BOSSES):
    bid = 'Cs%02d' % (bi + 1)
    BOSS_IDS.append(bid)
    boss = C.Obj('hfoo', bid, [])
    for fid, v in [('unam', bn), ('uhpm', bhp), ('ua1b', bdm), ('udef', bar), ('uabi', ''), ('ubba', 0), ('ubdi', 0), ('ubsi', 0),
                   ('umdl', bm), ('usca', bsc), ('umvs', 300), ('uacq', 700), ('ussc', bsc),
                   # v18: боссы бьют и воздух (у пехотинца-основы цели «земля, здания»: воздушных они не трогали)
                   ('ua1g', 'air,ground,structure,debris,tree,wall')]:
        boss.set(fid, v, gen.FTYPE[fid])
    utabs[1].append(boss)

# =====================================================================
# Скрипт
# =====================================================================
# 0) вырезать бэкдор: чит-команды по нику JJ2197 / FatherSpace и по секретной фразе
patch('if GetPlayerName(Player(zzz))=="JJ2197"then', 'if false then')
patch('if GetPlayerName(Player(zzz))=="FatherSpace"then', 'if false then')
patch('==Activator and not IsPlayerInForce(p2p,CHEATER) then', '==Activator and false then')
patch('return(IsPlayerInForce(GetTriggerPlayer(),CHEATER))', 'return false')

# 1) свои переменные
j = j.replace('globals\n', '''globals
real CF_T=0.
real CF_M=1.
integer array CF_FA
integer array CF_FD
integer array CF_FE
integer array CF_IA
integer array CF_ID
integer array CF_QA
integer array CF_Cmd
dialog array CF_CDlg
button array CF_CBtn
boolean CF_CmdBusy=false
boolean CF_CmdNoDlg=false
timer CF_CmdTm=CreateTimer()
hashtable CF_HD=InitHashtable()
integer CF_RI=0
unit CF_Boss=null
integer CF_Gold=0
real CF_BossY=0.
integer array CF_BossT
integer CF_BossLast=-1
integer CF_BossN=1
integer CF_BossIdx=0
integer CF_BossLane=-1
integer CF_BossRew=0
timer CF_BossTm=CreateTimer()
integer array CF_Zoom
boolean CF_MenuOn=true
dialog CF_DlgF=null
dialog CF_DlgC=null
button CF_BtnF0=null
button CF_BtnF1=null
button CF_BtnC0=null
button CF_BtnC1=null
button CF_BtnC2=null
integer CF_MenuF=-1
integer CF_MenuC=-1
dialog CF_DlgG=null
button array CF_BtnG
integer CF_MenuG=-1
dialog CF_DlgB=null
dialog CF_DlgA=null
dialog CF_DlgD=null
button array CF_BtnB
button array CF_BtnA
button array CF_BtnD
integer CF_MenuB=-1
integer CF_MenuA=-1
integer CF_MenuD=-1
integer CF_BD=0
integer array CF_PeN
integer array CF_PeL
integer array CF_BW
integer CF_Start=250
integer CF_UCap=500
integer array CF_UC
boolean array CF_Lim
boolean CF_MenuDone=false
real CF_MW=0.
''' + SJ.GLOBALS, 1)

# нейтралы (индекс 13) в таблице команд Fi по умолчанию = команда 0, поэтому карта считала босса «своим» для команды 0:
# триггер «атакован союзником» (jD/JD) отдавал приказ стоп и боссу, и юнитам команды 0. Исключаем нейтралов.
patch('return Fi[(1+GetPlayerId(GetOwningPlayer(GetAttacker())))]==Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]',
      'return GetOwningPlayer(GetAttacker())!=Player(PLAYER_NEUTRAL_AGGRESSIVE)and GetOwningPlayer(GetTriggerUnit())!=Player(PLAYER_NEUTRAL_AGGRESSIVE)and Fi[(1+GetPlayerId(GetOwningPlayer(GetAttacker())))]==Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]')

# 2) Этап 1: доход чаще в начале, реже в конце (0-8 мин 30% таймера, 8-16 50%, 16-25 70%, дальше 100%)
patch('''function PF takes nothing returns nothing
set ao[0]=0
set ao[1]=0
call ForForce(Ba,function pF)''', '''function PF takes nothing returns nothing
local real f
set CF_T=CF_T+TimerGetTimeout(ko)
if CF_T<480. then
set f=.3
elseif CF_T<960. then
set f=.5
elseif CF_T<1500. then
set f=.7
else
set f=1.
endif
set CF_M=.5+.5*f
set ao[0]=0
set ao[1]=0
call ForForce(Ba,function pF)
if RAbsBJ(TimerGetTimeout(ko)-I2R(Mo)*f)>.05 then
call TimerStart(ko,I2R(Mo)*f,true,null)
endif''')
# порция дохода: темп времени * кузница-экономика * помощь отстающей команде (замок слабее на 30%+ -> +15%)
patch('''function pF takes nothing returns nothing
set D=(1+GetPlayerId(GetEnumPlayer()))
set F=jI(D)''', '''function pF takes nothing returns nothing
local real m
local real a
local real b
set D=(1+GetPlayerId(GetEnumPlayer()))
set m=CF_M*(1.+.10*CF_FE[D-1])
// командир Саша: +12% к доходу
if CF_Cmd[D-1]==1 then
set m=CF_M*(1.+.10*CF_FE[D-1]+.12)
endif
// сила ботов из меню: +15/30/80% к доходу (только ботам)
if se[D] and CF_BD>0 then
set m=m+CF_M*I2R(CF_BD)/100.
// (v37, просьба владельца 2026-11-21: добавка +20% дохода на высшем уровне убрана, доход бота = уровень меню)
endif
//CMDLOG_INC
set a=GetWidgetLife(fE)/RMaxBJ(1.,GetUnitState(fE,UNIT_STATE_MAX_LIFE))
set b=GetWidgetLife(FE)/RMaxBJ(1.,GetUnitState(FE,UNIT_STATE_MAX_LIFE))
if(Fi[D]==0 and a<b-.3)or(Fi[D]==1 and b<a-.3)then
set m=m*1.15
endif
set F=R2I(I2R(jI(D))*m+.5)
//CMDLOG_F''')
# сильнее убывающая отдача от большого дохода: ступени по 15% вместо 10%, минимум 10%
patch('''exitwhen(i<pr)or(k>=8)
set i=i-pr
set j=j+pr*(1-k/ 10)
set k=k+1
endloop
set j=j+i*(1-k/ 10)''', '''exitwhen(i<pr)or(k>=6)
set i=i-pr
set j=j+pr*(1-k*.15)
set k=k+1
endloop
set j=j+i*(1-k*.15)''')

# 3) бонусы кузницы каждому новому бойцу (KB регистрирует всех бойцов игры)
patch('''function KB takes unit u returns nothing
local integer yI
if u==null then
return
endif
''', '''// лимит юнитов на игрока: считаем всех юнитов, кроме зданий и строителя (CF_UC), раз в секунду пересчёт, новые бойцы сверх лимита не появляются
function CF_Cap takes unit u returns boolean
local integer p=GetPlayerId(GetOwningPlayer(u))
if p>11 or IsUnitType(u,UNIT_TYPE_STRUCTURE) or GetUnitAbilityLevel(u,'Cf01')>0 then
return false
endif
if CF_UC[p]>=CF_UCap then
if not CF_Lim[p] then
set CF_Lim[p]=true
call DisplayTimedTextToPlayer(Player(p),0,0,8.,"|cffFF0000Лимит: "+I2S(CF_UCap)+" юнитов на игрока. Новые бойцы не появляются, пока часть не погибнет.|r")
endif
return true
endif
set CF_UC[p]=CF_UC[p]+1
return false
endfunction
function CF_Recount takes nothing returns nothing
local group g=CreateGroup()
local rect r=GetWorldBounds()
local unit u
local integer p=0
loop
exitwhen p>11
set CF_UC[p]=0
set p=p+1
endloop
call GroupEnumUnitsInRect(g,r,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
set p=GetPlayerId(GetOwningPlayer(u))
if p<=11 and GetWidgetLife(u)>.405 and not IsUnitType(u,UNIT_TYPE_STRUCTURE) then
set CF_UC[p]=CF_UC[p]+1
endif
endloop
set p=0
loop
exitwhen p>11
if CF_UC[p]<CF_UCap then
set CF_Lim[p]=false
endif
set p=p+1
endloop
call RemoveRect(r)
call DestroyGroup(g)
set g=null
set r=null
endfunction
// бонус кузницы новому бойцу: свой уровень + половина лучшего союзника (его уровни 3-5)
function CF_Up takes unit u returns nothing
local integer p=GetPlayerId(GetOwningPlayer(u))
local integer cf_q=0
local integer cf_a=0
local integer cf_d=0
local integer cf_v
if p<0 or p>11 or IsUnitType(u,UNIT_TYPE_STRUCTURE)then
return
endif
loop
exitwhen cf_q>11
if cf_q!=p and Fi[cf_q+1]==Fi[p+1]and GetPlayerSlotState(Player(cf_q))==PLAYER_SLOT_STATE_PLAYING then
if CF_FA[cf_q]-2>cf_a then
set cf_a=CF_FA[cf_q]-2
endif
if CF_FD[cf_q]-2>cf_d then
set cf_d=CF_FD[cf_q]-2
endif
endif
set cf_q=cf_q+1
endloop
// атака: шаги по 4% (свой уровень = 2 шага, уровень союзника сверх 2-го = 1 шаг)
set cf_a=2*CF_FA[p]+cf_a
// командир Дима: +24% к урону (6 ступеней по 4%)
if CF_Cmd[p]==3 then
set cf_a=cf_a+6
endif
// сила ботов из меню: ступени по 4% урона (15% = 4, 30% = 8, 80% = 20), только ботам
if se[p+1] and CF_BD>0 then
set cf_a=cf_a+(CF_BD+2)/4
endif
if cf_a>0 then
set cf_v=LoadInteger(CF_HD,0,GetUnitTypeId(u))
if cf_v<=0 then
set cf_v=30
endif
set cf_v=R2I(I2R(cf_v)*.04*I2R(cf_a)+.5)
if cf_v<1 then
set cf_v=1
elseif cf_v>''' + str(QMAX) + ''' then
set cf_v=''' + str(QMAX) + '''
endif
call UnitAddAbility(u,CF_QA[cf_v])
endif
// броня: свой уровень + половина союзника (округление вверх)
set cf_d=CF_FD[p]+(cf_d+1)/2
if cf_d==6 then
call UnitAddAbility(u,'AId5')
call UnitAddAbility(u,'AId1')
elseif cf_d>0 then
call UnitAddAbility(u,CF_ID[cf_d])
endif
// командир Дэн: +24% скорости атаки (одна общая способность Cc01)
if CF_Cmd[p]==4 then
call UnitAddAbility(u,'Cc01')
endif
// командир Леша: 20% шанс уклониться (Cc02); командир Юра: 25% шанс критического удара x2 (Cc03)
if CF_Cmd[p]==6 then
call UnitAddAbility(u,'Cc02')
elseif CF_Cmd[p]==5 then
call UnitAddAbility(u,'Cc03')
endif
//CMDLOG_UP
endfunction
function KB takes unit u returns nothing
local integer yI
if u==null then
return
endif
if CF_Cap(u) then
call RemoveUnit(u)
return
endif
call CF_Up(u)
''')

# 3б) новый раунд: кузница и часы ботов с нуля (иначе можно слить раунд ради прокачки)
patch('''set Rr[i]=bj_lastCreatedUnit
''', '''set Rr[i]=bj_lastCreatedUnit
set CF_RI=0
loop
exitwhen CF_RI>11
set CF_FA[CF_RI]=0
set CF_FD[CF_RI]=0
set CF_FE[CF_RI]=0
set CF_BotNext[CF_RI]=0.
set CF_BotSave[CF_RI]=false
set CF_RI=CF_RI+1
endloop
set CF_StrikeT[0]=0.
set CF_StrikeT[1]=0.
set CF_BT=0.
call FlushChildHashtable(CF_HD,31)
call FlushChildHashtable(CF_HD,32)
call FlushChildHashtable(CF_HD,33)
call FlushChildHashtable(CF_HD,34)
call FlushChildHashtable(CF_HD,35)
call FlushChildHashtable(CF_HD,36)
call FlushChildHashtable(CF_HD,37)
call FlushChildHashtable(CF_HD,38)
call FlushChildHashtable(CF_HD,39)
call FlushChildHashtable(CF_HD,40)
call FlushChildHashtable(CF_HD,41)
call FlushChildHashtable(CF_HD,42)
call CF_PLog("ROUND start start="+I2S(CF_Start)+" bd="+I2S(CF_BD))
call CF_BossReset()
call CF_CmdRound()
call CF_SpReset()
''')


# 3б2) v25 (просьба владельца): окно для ввода команд 5 секунд вместо 20; потом кнопки режимов (меню хозяина и диалоги оригинала)
# v30 (просьба владельца 2026-11-20): окно 15 секунд (чтобы расставить ботов командами до диалогов меню). В тестовых сборках 5 с, чтобы автотесты не ждали
CF_WIN = 5 if VER.startswith('test') else 15
patch('call TriggerRegisterTimerEventSingle(Bn,21.)', f'call TriggerRegisterTimerEventSingle(Bn,{CF_WIN}.)')
patch('У вас есть 20 секунд, чтобы ввести игровые моды.', f'У вас есть {CF_WIN} секунд, чтобы ввести игровые моды.')
patch('должен установить игровые моды в течении 20 секунд.', f'должен установить игровые моды в течении {CF_WIN} секунд.')

# 3в) v18: босс по раундам, меню старта (туман/монетки), +50 золота за случайную расу
patch('function QC takes nothing returns nothing\n', '''// босс привязан к раунду: старый уходит, счётчик наград и очередь линий с нуля, первый босс через 3 минуты
function CF_BossReset takes nothing returns nothing
if CF_Boss!=null then
call RemoveUnit(CF_Boss)
set CF_Boss=null
endif
set CF_BossIdx=0
set CF_BossLane=-1
call TimerStart(CF_BossTm,180.,true,null)
endfunction
// командиры друзей: выбор на раунд (диалог каждому человеку, боты выбирают случайно), бонусы в CF_Up, pF и CF_Forge
function CF_CmdName takes integer c returns string
if c==1 then
return "Саша: +12% к доходу"
elseif c==2 then
return "Алик: кузница дешевле на 50%"
elseif c==3 then
return "Дима: +24% к урону бойцов"
elseif c==4 then
return "Дэн: +24% к скорости атаки бойцов"
elseif c==5 then
return "Юра: 25% шанс критического удара (x2)"
elseif c==6 then
return "Леша: 20% шанс уклониться от атаки"
endif
return "Без командира"
endfunction
function CF_CmdClick takes nothing returns nothing
local integer cf_p=0
local integer cf_k
loop
exitwhen cf_p>11
if GetClickedDialog()==CF_CDlg[cf_p] then
set cf_k=0
loop
exitwhen cf_k>6
if GetClickedButton()==CF_CBtn[cf_p*7+cf_k] then
set CF_Cmd[cf_p]=cf_k
//CMDLOG_CLICK
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00"+GetPlayerName(Player(cf_p))+" выбрал командира: "+CF_CmdName(cf_k)+"|r")
endif
set cf_k=cf_k+1
endloop
endif
set cf_p=cf_p+1
endloop
endfunction
function CF_CmdClose takes nothing returns nothing
local integer cf_p=0
loop
exitwhen cf_p>11
call DialogDisplay(Player(cf_p),CF_CDlg[cf_p],false)
set cf_p=cf_p+1
endloop
set CF_CmdBusy=false
endfunction
// выбор командира ботом (просьба владельца 2026-11-21): только Саша (1), Дима (3) или Дэн (4); внутри команды по возможности разные
function CF_BotPick takes integer p returns integer
local integer cf_q=0
local integer cf_t=0
local integer cf_r
local integer cf_v
local boolean cf_used
set cf_r=GetRandomInt(0,2)
loop
exitwhen cf_t>2
set cf_v=ModuloInteger(cf_r+cf_t,3)
if cf_v==0 then
set cf_v=1
else
set cf_v=cf_v+2
endif
set cf_used=false
set cf_q=0
loop
exitwhen cf_q>=p
if Fi[cf_q+1]==Fi[p+1] and CF_Cmd[cf_q]==cf_v then
set cf_used=true
endif
set cf_q=cf_q+1
endloop
if not cf_used then
return cf_v
endif
set cf_t=cf_t+1
endloop
return 3
endfunction
function CF_CmdRound takes nothing returns nothing
local integer cf_p=0
local integer cf_k
if CF_CmdBusy then
return
endif
set CF_CmdBusy=true
loop
exitwhen cf_p>11
set CF_Cmd[cf_p]=0
if se[cf_p+1] then
set CF_Cmd[cf_p]=CF_BotPick(cf_p)
elseif GetPlayerSlotState(Player(cf_p))==PLAYER_SLOT_STATE_PLAYING then
if GetPlayerController(Player(cf_p))==MAP_CONTROL_USER and not CF_CmdNoDlg and not se[cf_p+1] then
call DialogClear(CF_CDlg[cf_p])
call DialogSetMessage(CF_CDlg[cf_p],"Командир на этот раунд")
set cf_k=0
loop
exitwhen cf_k>6
call DialogAddButtonBJ(CF_CDlg[cf_p],CF_CmdName(cf_k))
set CF_CBtn[cf_p*7+cf_k]=bj_lastCreatedButton
set cf_k=cf_k+1
endloop
call DialogDisplay(Player(cf_p),CF_CDlg[cf_p],true)
elseif GetPlayerController(Player(cf_p))==MAP_CONTROL_COMPUTER or se[cf_p+1] then
set CF_Cmd[cf_p]=CF_BotPick(cf_p)
endif
endif
set cf_p=cf_p+1
endloop
call TimerStart(CF_CmdTm,30.,false,function CF_CmdClose)
endfunction
''' + RSJ.FUNCS + '''function QC takes nothing returns nothing
''')
patch('call RemoveUnit(GetSoldUnit())\nset i=rA(p)\nif Ca==3 then\n',
      'call RemoveUnit(GetSoldUnit())\nset i=rA(p)\ncall AdjustPlayerStateBJ(R2I(CF_Start*0.3),p,PLAYER_STATE_RESOURCE_GOLD)\n'
      'call DisplayTimedTextToPlayer(p,0,0,8.,"|cffFFFF00+30% золота|r за случайную расу!")\nif Ca==3 then\n')
patch('function ld takes nothing returns nothing\nset ir=true\ncall DisableTrigger(GetTriggeringTrigger())\n', '''function CF_MenuFogClick takes nothing returns nothing
if GetClickedButton()==CF_BtnF1 then
set CF_MenuF=1
else
set CF_MenuF=0
endif
endfunction
function CF_MenuCoinClick takes nothing returns nothing
if GetClickedButton()==CF_BtnC2 then
set CF_MenuC=2
elseif GetClickedButton()==CF_BtnC1 then
set CF_MenuC=1
else
set CF_MenuC=0
endif
endfunction
function CF_MenuFill takes nothing returns nothing
call DialogClear(CF_DlgF)
call DialogSetMessage(CF_DlgF,"Туман войны на всю игру?")
call DialogAddButtonBJ(CF_DlgF,"Без тумана")
set CF_BtnF0=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgF,"Туман войны")
set CF_BtnF1=bj_lastCreatedButton
call DialogClear(CF_DlgC)
call DialogSetMessage(CF_DlgC,"Монетки?")
call DialogAddButtonBJ(CF_DlgC,"Без монеток")
set CF_BtnC0=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgC,"Монетки (каждые 40 с)")
set CF_BtnC1=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgC,"Бешеные монетки (по 10)")
set CF_BtnC2=bj_lastCreatedButton
call DialogClear(CF_DlgG)
call DialogSetMessage(CF_DlgG,"Стартовый бюджет (золото в начале каждого раунда)")
call DialogAddButtonBJ(CF_DlgG,"250 (стандарт)")
set CF_BtnG[0]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgG,"500")
set CF_BtnG[1]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgG,"750")
set CF_BtnG[2]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgG,"1000")
set CF_BtnG[3]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgG,"1500")
set CF_BtnG[4]=bj_lastCreatedButton
call DialogClear(CF_DlgB)
call DialogSetMessage(CF_DlgB,"Боты в команде противника")
call DialogAddButtonBJ(CF_DlgB,"Без ботов")
set CF_BtnB[0]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgB,"1 бот")
set CF_BtnB[1]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgB,"2 бота")
set CF_BtnB[2]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgB,"3 бота")
set CF_BtnB[3]=bj_lastCreatedButton
call DialogClear(CF_DlgA)
call DialogSetMessage(CF_DlgA,"Боты в вашей команде")
call DialogAddButtonBJ(CF_DlgA,"Без ботов")
set CF_BtnA[0]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgA,"1 бот")
set CF_BtnA[1]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgA,"2 бота")
set CF_BtnA[2]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgA,"3 бота")
set CF_BtnA[3]=bj_lastCreatedButton
call DialogClear(CF_DlgD)
call DialogSetMessage(CF_DlgD,"Сила ботов (бонус к доходу и урону)")
call DialogAddButtonBJ(CF_DlgD,"Обычные (0%)")
set CF_BtnD[0]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgD,"Сильные (+15%)")
set CF_BtnD[1]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgD,"Очень сильные (+30%)")
set CF_BtnD[2]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgD,"Безумные (+80%)")
set CF_BtnD[3]=bj_lastCreatedButton
endfunction
function CF_MenuBotsClick takes nothing returns nothing
local integer cf_i=0
loop
exitwhen cf_i>3
if GetClickedButton()==CF_BtnB[cf_i] then
set CF_MenuB=cf_i
endif
if GetClickedButton()==CF_BtnA[cf_i] then
set CF_MenuA=cf_i
endif
if GetClickedButton()==CF_BtnD[cf_i] then
set CF_MenuD=cf_i
endif
set cf_i=cf_i+1
endloop
endfunction
function CF_MenuGoldClick takes nothing returns nothing
local integer cf_i=0
loop
exitwhen cf_i>4
if GetClickedButton()==CF_BtnG[cf_i] then
set CF_MenuG=cf_i
endif
set cf_i=cf_i+1
endloop
endfunction
// меню хозяина (красный игрок) перед выбором режима: туман войны, монетки, стартовый бюджет; туман и монетки = команды -fow и -co / -cc
function CF_Menu takes nothing returns nothing
local real cf_w=0.
local integer cf_i=1
local boolean cf_any=false
if not CF_MenuOn or GetPlayerSlotState(Player(0))!=PLAYER_SLOT_STATE_PLAYING or GetPlayerController(Player(0))!=MAP_CONTROL_USER then
set CF_MenuDone=true
return
endif
call CF_MenuFill()
if jx==0 then
set CF_MenuF=-1
call DialogDisplay(Player(0),CF_DlgF,true)
loop
exitwhen CF_MenuF>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgF,false)
endif
set cf_w=0.
if uo==0 then
set CF_MenuC=-1
call DialogDisplay(Player(0),CF_DlgC,true)
loop
exitwhen CF_MenuC>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgC,false)
endif
set cf_w=0.
set CF_MenuG=-1
call DialogDisplay(Player(0),CF_DlgG,true)
loop
exitwhen CF_MenuG>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgG,false)
set cf_w=0.
set CF_MenuB=-1
call DialogDisplay(Player(0),CF_DlgB,true)
loop
exitwhen CF_MenuB>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgB,false)
set cf_w=0.
set CF_MenuA=-1
call DialogDisplay(Player(0),CF_DlgA,true)
loop
exitwhen CF_MenuA>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgA,false)
// боты: счётчики оригинала (zo по командам, ii=3 добавляет перед первым раундом), тот же путь, что у команд -east и -west
if CF_MenuB>0 then
set zo[1-Fi[1]]=CF_MenuB
set ii=3
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00Боты у противника: "+I2S(CF_MenuB)+"|r")
endif
if CF_MenuA>0 then
set zo[Fi[1]]=CF_MenuA
set ii=3
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00Боты в вашей команде: "+I2S(CF_MenuA)+"|r")
endif
// боты из слотов Computer лобби тоже получают силу из меню (se[] уже выставлен при старте карты)
loop
exitwhen cf_i>12
if se[cf_i] then
set cf_any=true
endif
set cf_i=cf_i+1
endloop
if CF_MenuB>0 or CF_MenuA>0 or cf_any then
set cf_w=0.
set CF_MenuD=-1
call DialogDisplay(Player(0),CF_DlgD,true)
loop
exitwhen CF_MenuD>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgD,false)
// без выбора (45 с) боты получают высшую силу
if CF_MenuD<0 then
set CF_MenuD=3
endif
if CF_MenuD==1 then
set CF_BD=15
elseif CF_MenuD==2 then
set CF_BD=30
elseif CF_MenuD==3 then
set CF_BD=80
endif
if CF_BD>0 then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00Сила ботов: +"+I2S(CF_BD)+"% к доходу и урону|r")
endif
endif
if CF_MenuG==1 then
set CF_Start=500
elseif CF_MenuG==2 then
set CF_Start=750
elseif CF_MenuG==3 then
set CF_Start=1000
elseif CF_MenuG==4 then
set CF_Start=1500
endif
if CF_Start!=250 then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00Стартовый бюджет: "+I2S(CF_Start)+" золота|r")
endif
if CF_MenuF==1 and jx==0 then
call vd("")
endif
if CF_MenuC==1 and uo==0 then
call TriggerExecute(uV)
elseif CF_MenuC==2 and uo==0 then
call TriggerExecute(YV)
endif
set CF_MenuDone=true
endfunction
function CF_MenuStart takes nothing returns nothing
call CF_Menu()
endfunction
function ld takes nothing returns nothing
set ir=true
call DisableTrigger(GetTriggeringTrigger())
// меню запускается на 2-й секунде игры, здесь только ждём его конец (не дольше 60 с)
set CF_MW=0.
loop
exitwhen CF_MenuDone or CF_MW>=240.
call TriggerSleepAction(.25)
set CF_MW=CF_MW+.25
endloop
''')
# статистика «потрачено на предметы» (Qo): считаем и два новых предмета
_qo = 'set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+'
patch(_qo + '150)\nendif\nendfunction\nfunction rG takes nothing returns integer\n',
      _qo + '150)\nendif\n'
      "if GetItemTypeId(GetManipulatedItem())=='I00E' then\n" + _qo + '300)\nendif\n'
      "if GetItemTypeId(GetManipulatedItem())=='I00F' then\n" + _qo + '900)\nendif\n'
      'endfunction\nfunction rG takes nothing returns integer\n')
# стартовый бюджет раунда из меню (в оригинале 250; режим Cx = 100 не трогаем)
patch('call SetPlayerStateBJ(Player(-1+(i)),PLAYER_STATE_RESOURCE_GOLD,250)\n', 'call SetPlayerStateBJ(Player(-1+(i)),PLAYER_STATE_RESOURCE_GOLD,CF_Start+IntegerTertiaryOp(se[i],R2I(I2R(CF_Start)*.3),0))\n')
# боты всегда играют случайной расой (оригинал: ui=GetRandomInt), поэтому получают те же +30% к старту, что человек за случайную расу.
# Родной ИИ смотрит только на «ярус цены» по доходу (Ix/Nx/bx/Ax): с большим стартом бот брал дешёвое. Поднимаем ярус по золоту в руке
# (>=360 ярус 2, >=560 ярус 3, >=800 ярус 4: только дорогие и сильные здания), естественный ярус по доходу хранится в CF_PeN и не теряется.
# Тест testn5: с ярусом 4 и 910 золота бот копил на здание дороже денег и 30 с ничего не строил, поэтому при поднятом ярусе берём только то, что по карману.
# СКОРОСТЬ БОТА (2026-11-21, партия владельца: человек успел выиграть быстрыми дорогими постройками).
# Оригинал: первые 25 с раунда бот не строит (флаг cx, пока нет врагов) и принимает ОДНО решение о постройке раз в 12 с (CG каждые 2 с, pc при KE>4).
# Убираем ожидание. Решение принимается КАЖДЫЙ такт CG (2 с), но только когда строитель свободен (CF_BotReady): иначе новый приказ
# сбрасывал бы ещё не поставленное здание. Если строитель занят дольше 3 тактов (6 с), решение всё равно принимается (CF_BW).
patch('if(not cx)or Ze[Ae]+ze[Ae]>0 then', 'if CF_BotReady(SB)then')
patch('function CG takes nothing returns nothing\nlocal integer i=0\nif KE>4 then', 'function CG takes nothing returns nothing\nlocal integer i=0\nif KE>-1 then')
# в оригинале цена даёт в очки здания всего цена/15 (380 золота = +25), случайность 0-50 и контры важнее: бот брал не самое сильное.
# С деньгами (поднятый ярус) вес цены цена/4, чтобы выбирались дорогие и сильные здания.
# Разнообразие: за каждое уже построенное в раунде такое же здание минус 60 очков (счётчик CF_HD, родитель 30+номер игрока).
patch('set gc=gc+fc/ ie\n', 'set gc=gc+fc/ IntegerTertiaryOp(Pe[SB]!=CF_PeN[SB],4,ie)-LoadInteger(CF_HD,30+SB,II)*60\n', 2)
patch('if Je[SB]>0 and lc==Je[SB]then\nset Je[SB]=0\nendif\n',
      'if Lc then\ncall SaveInteger(CF_HD,30+SB,lc,LoadInteger(CF_HD,30+SB,lc)+1)\nif lc==je[SB]then\nset je[SB]=0\nendif\nendif\nif Je[SB]>0 and lc==Je[SB]then\nset Je[SB]=0\nendif\n')
# улучшения: чаще рассматриваем (le = «улучшения допустимы» в этом расчёте) для ботов
patch('set Ke[SB]=0\nset ke[SB]=0\n', 'set Ke[SB]=0\nset ke[SB]=0\nif GetRandomInt(0,99)<35 then\nset le[SB]=true\nendif\n')
_bready = ('function CF_BotReady takes integer SB returns boolean\nlocal integer cf_o\n'
           'if br[SB]==null then\nreturn false\nendif\nset cf_o=GetUnitCurrentOrder(br[SB])\n'
           'if cf_o==0 or cf_o==851972 then\nset CF_BW[SB]=0\nreturn true\nendif\n'
           'set CF_BW[SB]=CF_BW[SB]+1\nif CF_BW[SB]>=3 then\nset CF_BW[SB]=0\nreturn true\nendif\nreturn false\nendfunction\n')
patch('function yR takes nothing returns nothing\n', _bready + 'function yR takes nothing returns nothing\n')
# лог ботов (только пробная сборка NNlog): Logs\cfbot.txt. Функция объявлена до Kc, в релизе пустая
if PROBE:
    _plog = 'function CF_PLog takes string s returns nothing\ncall Preload(s)\ncall PreloadGenEnd("Logs' + chr(92) * 2 + 'cfbot.txt")\nendfunction\n'
else:
    _plog = 'function CF_PLog takes string s returns nothing\nendfunction\n'
patch('function yR takes nothing returns nothing\n', _plog + 'function yR takes nothing returns nothing\n')
if PROBE:
    patch('function Kc takes integer SB,integer lc,boolean Lc returns nothing\n',
          'function Kc takes integer SB,integer lc,boolean Lc returns nothing\n'
          'call CF_PLog("BUILD p="+I2S(SB-1)+" "+GetObjectName(lc)+" price="+I2S(Fx[GetUnitPointValueByType(lc)])+" ok="+I2S(IntegerTertiaryOp(Lc,1,0))+" gold="+I2S(GetPlayerState(Player(SB-1),PLAYER_STATE_RESOURCE_GOLD))+" tier="+I2S(Pe[SB])+" natural="+I2S(CF_PeN[SB])+" time="+R2S(CF_BT))\n')
# с деньгами (поднятый ярус) бот всегда рассматривает улучшение здания, а не только с шансом Ve%
patch('if GetRandomInt(0,99)<Ve then\nset Le[SB]=true', 'if GetRandomInt(0,99)<Ve or(Pe[SB]!=CF_PeN[SB]and Pe[SB]>=3)then\nset Le[SB]=true')
patch('if Fx[Fc]>Nx[Pe[SB]]or ca[Fc]>Nx[Pe[SB]]or fc>bx[Pe[SB]]or(fc<Ax[Pe[SB]]and gi[Fc]<2)then', 'if Fx[Fc]>Nx[Pe[SB]]or ca[Fc]>Nx[Pe[SB]]or fc>bx[Pe[SB]]or(fc<Ax[Pe[SB]]and gi[Fc]<2)or(Pe[SB]!=CF_PeN[SB]and Fx[Fc]>ce)then')
patch('if Ne>Ix[Pe[SB]]then\nset Pe[SB]=Pe[SB]+1\nendif\n', '''if Pe[SB]!=CF_PeL[SB]then
set CF_PeN[SB]=Pe[SB]
endif
set Pe[SB]=CF_PeN[SB]
if Ne>Ix[Pe[SB]]then
set Pe[SB]=Pe[SB]+1
endif
set CF_PeN[SB]=Pe[SB]
if ce>=800 and Pe[SB]<4 then
set Pe[SB]=4
elseif ce>=560 and Pe[SB]<3 then
set Pe[SB]=3
elseif ce>=360 and Pe[SB]<2 then
set Pe[SB]=2
endif
set CF_PeL[SB]=Pe[SB]
''')

# 4) кузница, умения рас, страж центра
sum_lines, spell_lines = [], []
for ri, (bid, rn) in enumerate(RACES):
    nm, ico, tt, kind, par, tip = SKILL[rn]
    aid = 'Cr%02d' % ri
    if kind == 'dmg':
        act = f"call CF_BuffDmg(p,{par}.)"
    elif kind == 'as':
        act = f"call CF_Buff(p,'Cbs1',{par}.)"
    elif kind == 'evade':
        act = f"call CF_Buff(p,'Cbe1',{par}.)"
    elif kind == 'shield':
        act = f"call CF_Buff(p,'AId5',{par}.)"
    elif kind == 'slow':
        act = f"call CF_Slow(p,{par}.)"
    elif kind == 'plague':
        act = f"call CF_Plague(c,{par / 100:.2f})"
    elif kind == 'sbor':
        act = f"call CF_Assemble(p,{par}.)"
    elif kind == 'mine':
        act = f"call CF_Mine(c,{par[0]}.,{par[1]}.)"
    elif kind == 'infect':
        act = f"call CF_Infect(c,GetSpellTargetX(),GetSpellTargetY(),{par[1]}.,{par[0]}.)"
    else:
        act = f"call CF_Nuke(c,GetSpellTargetX(),GetSpellTargetY(),{par[1]}.,{par[0]}.)"
    spell_lines.append(f"elseif id=='{aid}' then\nif CF_Gate(p,c) then\n{act}\ncall CF_Say(p,\"{nm}\")\nendif")
# предметы замка: без CF_Gate, доступны с первой минуты (когда пополнится запас в замке)
spell_lines.append(f"elseif id=='Ci01' then\ncall CF_Weaken(p,c,{ITEM_WK_R}.,{ITEM_WK_T}.)\ncall CF_Say(p,\"Свиток Слабости\")")
spell_lines.append(f"elseif id=='Ci02' then\ncall CF_Dome(p,c,{ITEM_DM_R}.,{ITEM_DM_T}.)\ncall CF_Say(p,\"Лазурный купол\")")
spell_body = '\n'.join(spell_lines)

CF_FUNCS = '''// ---------- Castle Fight mod: кузница, умения рас, страж центра ----------
function CF_Castle takes integer t returns unit
if Rr[t]!=null then
return Rr[t]
endif
if t==0 then
return fE
endif
return FE
endfunction
function CF_Say takes integer p,string s returns nothing
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,6.,GetPlayerName(Player(p))+": |cffFFCC00"+s+"|r")
endfunction
// кнопки кузницы у строителя: уровень кнопки = купленный уровень + 1, подсказка показывает следующий шаг
function CF_ForgeLvl takes integer p returns nothing
local group cf_g=CreateGroup()
local unit u
call GroupEnumUnitsOfPlayer(cf_g,Player(p),null)
loop
set u=FirstOfGroup(cf_g)
exitwhen u==null
call GroupRemoveUnit(cf_g,u)
if GetUnitAbilityLevel(u,'Cf01')>0 then
if GetUnitAbilityLevel(u,'Cf01')!=CF_FA[p]+1 then
call SetUnitAbilityLevel(u,'Cf01',CF_FA[p]+1)
endif
if GetUnitAbilityLevel(u,'Cf02')!=CF_FD[p]+1 then
call SetUnitAbilityLevel(u,'Cf02',CF_FD[p]+1)
endif
if GetUnitAbilityLevel(u,'Cf03')!=CF_FE[p]+1 then
call SetUnitAbilityLevel(u,'Cf03',CF_FE[p]+1)
endif
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
endfunction
function CF_ForgeLvlAll takes nothing returns nothing
local integer i=0
loop
exitwhen i>11
// только живые игроки-люди (боты кнопок не смотрят); раньше перебирались все юниты всех 12 игроков каждые 2 с
if GetPlayerSlotState(Player(i))==PLAYER_SLOT_STATE_PLAYING and GetPlayerController(Player(i))==MAP_CONTROL_USER then
call CF_ForgeLvl(i)
endif
set i=i+1
endloop
endfunction
function CF_Forge takes integer p,integer k returns nothing
local integer cf_L
local integer g
local integer cf_full
local integer cf_mx=5
if k==0 then
set cf_L=CF_FA[p]
set g=200+100*cf_L
elseif k==1 then
set cf_L=CF_FD[p]
set g=150+75*cf_L
else
set cf_L=CF_FE[p]
set g=150+100*cf_L
set cf_mx=3
endif
// командир Алик: кузница дешевле на 50%
set cf_full=g
if CF_Cmd[p]==2 then
set g=R2I(I2R(g)*.5+.5)
endif
if cf_L>=cf_mx then
call DisplayTimedTextToPlayer(Player(p),0,0,5.,"|cffFF0000Уже максимальный уровень.|r")
return
endif
if GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_GOLD)<g then
call DisplayTimedTextToPlayer(Player(p),0,0,5.,"|cffFF0000Нужно "+I2S(g)+" золота.|r")
return
endif
call AdjustPlayerStateBJ(-g,Player(p),PLAYER_STATE_RESOURCE_GOLD)
if CF_Cmd[p]==2 then
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"|cffFFFF00Скидка Алика (-50%): цена "+I2S(cf_full)+", заплачено "+I2S(g)+" золота|r")
endif
if k==0 then
set CF_FA[p]=cf_L+1
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"Кузница: атака +"+I2S(8*(cf_L+1))+"% ("+I2S(cf_L+1)+" из 5). Действует на новых бойцов.")
elseif k==1 then
set CF_FD[p]=cf_L+1
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"Кузница: броня +"+I2S(cf_L+1)+" ("+I2S(cf_L+1)+" из 5). Действует на новых бойцов.")
else
set CF_FE[p]=cf_L+1
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"Кузница: экономика, доход +"+I2S(10*(cf_L+1))+"% ("+I2S(cf_L+1)+" из 3).")
endif
if k<2 and cf_L+1>=3 then
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"Союзники получают половину этого бонуса.")
endif
call CF_ForgeLvl(p)
endfunction
function CF_Summon takes integer p,integer typ,integer cf_n returns nothing
local integer t=Fi[p+1]
local unit c=CF_Castle(t)
local unit e=CF_Castle(1-t)
local real d=300.
local unit u
if t==1 then
set d=-300.
endif
loop
exitwhen cf_n<=0
set u=CreateUnit(Player(p),typ,GetUnitX(c)+d,GetUnitY(c)+GetRandomReal(-250.,250.),0.)
call KB(u)
call IssuePointOrder(u,"attack",GetUnitX(e),GetUnitY(e))
set cf_n=cf_n-1
endloop
set c=null
set e=null
set u=null
endfunction
function CF_Heal takes integer p,real k returns nothing
local group g=CreateGroup()
local unit u
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and not IsUnitType(u,UNIT_TYPE_STRUCTURE)then
call SetWidgetLife(u,GetWidgetLife(u)+GetUnitState(u,UNIT_STATE_MAX_LIFE)*k)
call DestroyEffect(AddSpecialEffectTarget("Abilities\\\\Spells\\\\Human\\\\Heal\\\\HealTarget.mdl",u,"origin"))
endif
endloop
call DestroyGroup(g)
set g=null
endfunction
function CF_Fix takes integer p,real k returns nothing
local unit c=CF_Castle(Fi[p+1])
call SetWidgetLife(c,GetWidgetLife(c)+GetUnitState(c,UNIT_STATE_MAX_LIFE)*k)
call DestroyEffect(AddSpecialEffectTarget("Abilities\\\\Spells\\\\Human\\\\Heal\\\\HealTarget.mdl",c,"origin"))
set c=null
endfunction
function CF_Nuke takes unit c,real x,real y,real r,real dmg returns nothing
local group g=CreateGroup()
local unit u
call DestroyEffect(AddSpecialEffect("Abilities\\\\Spells\\\\Human\\\\Thunderclap\\\\ThunderClapCaster.mdl",x,y))
call GroupEnumUnitsInRange(g,x,y,r,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitEnemy(u,GetOwningPlayer(c))and not IsUnitType(u,UNIT_TYPE_STRUCTURE)then
call UnitDamageTarget(c,u,dmg,false,false,ATTACK_TYPE_MAGIC,DAMAGE_TYPE_MAGIC,WEAPON_TYPE_WHOKNOWS)
endif
endloop
call DestroyGroup(g)
set g=null
endfunction
''' + SJ.jass(rows, DMG_TIERS) + '''function CF_OnSpell takes nothing returns nothing
local integer id=GetSpellAbilityId()
local unit c=GetTriggerUnit()
local integer p=GetPlayerId(GetOwningPlayer(c))
if p>11 then
set c=null
return
endif
if id=='Cf01' then
call CF_Forge(p,0)
elseif id=='Cf02' then
call CF_Forge(p,1)
elseif id=='Cf03' then
call CF_Forge(p,2)
''' + spell_body + '''
endif
set c=null
endfunction
function CF_GiveGold takes nothing returns nothing
call AdjustPlayerStateBJ(CF_Gold,GetEnumPlayer(),PLAYER_STATE_RESOURCE_GOLD)
endfunction
function CF_BossDie takes nothing returns nothing
local unit k=GetKillingUnit()
local integer p
local integer t
if GetTriggerUnit()!=CF_Boss then
set k=null
return
endif
set CF_Boss=null
if k==null then
return
endif
set p=GetPlayerId(GetOwningPlayer(k))
set k=null
if p>11 then
return
endif
set t=Fi[p+1]
set CF_Gold=CF_BossRew
call ForForce(wo[t],function CF_GiveGold)
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,10.,"|cffFFCC00Босс повержен! Команда "+GetPlayerName(Player(p))+" получает по "+I2S(CF_Gold)+" золота.|r")
endfunction
function CF_BossSpawn takes nothing returns nothing
local trigger t
local integer i
local string cf_l
if CF_Boss!=null and GetWidgetLife(CF_Boss)>.405 then
return
endif
// линия: 0 верхняя, 1 нижняя. Одна линия открыта (-sl): только она, иначе по очереди, первый босс на верхней
if io==0 then
set CF_BossLane=1
elseif io==1 then
set CF_BossLane=0
elseif CF_BossLane==0 then
set CF_BossLane=1
else
set CF_BossLane=0
endif
if CF_BossLane==1 then
set CF_BossY=GetRectCenterY(on)
set cf_l="нижней"
else
set CF_BossY=GetRectCenterY(xn)
set cf_l="верхней"
endif
set CF_BossIdx=CF_BossIdx+1
set CF_BossRew=10+20*(CF_BossIdx-1)
if CF_BossRew>110 then
set CF_BossRew=110
endif
// другой герой, чем в прошлый раз
set i=GetRandomInt(0,CF_BossN-1)
if i==CF_BossLast then
set i=ModuloInteger(i+1,CF_BossN)
endif
set CF_BossLast=i
set CF_Boss=CreateUnit(Player(PLAYER_NEUTRAL_AGGRESSIVE),CF_BossT[i],0.,CF_BossY,270.)
set t=CreateTrigger()
call TriggerRegisterUnitEvent(t,CF_Boss,EVENT_UNIT_DEATH)
call TriggerAddAction(t,function CF_BossDie)
set t=null
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,10.,"|cffFFCC00Босс "+GetUnitName(CF_Boss)+" появился на "+cf_l+" линии! Кто его добьёт, получит по "+I2S(CF_BossRew)+" золота на игрока.|r")
call PingMinimap(0.,CF_BossY,4.)
endfunction
function CF_Find takes string cf_h,string cf_n returns integer
local integer cf_i=0
local integer cf_l=StringLength(cf_n)
local integer cf_m=StringLength(cf_h)-cf_l
loop
exitwhen cf_i>cf_m
if SubString(cf_h,cf_i,cf_i+cf_l)==cf_n then
return cf_i
endif
set cf_i=cf_i+1
endloop
return -1
endfunction
function CF_ZoomSet takes player cf_p,integer cf_v returns nothing
local integer cf_d=GetPlayerId(cf_p)
if cf_d<0 or cf_d>11 then
return
endif
set CF_Zoom[cf_d]=cf_v
if GetLocalPlayer()==cf_p then
if cf_v<=0 then
call SetCameraField(CAMERA_FIELD_TARGET_DISTANCE,1650.,.3)
call SetCameraField(CAMERA_FIELD_FARZ,5000.,.3)
else
call SetCameraField(CAMERA_FIELD_TARGET_DISTANCE,I2R(cf_v),.3)
call SetCameraField(CAMERA_FIELD_FARZ,RMaxBJ(5000.,I2R(cf_v)*2.5),.3)
endif
endif
endfunction
// зум: "-zoom 1500", "zoom 2000", "зум 1000", "-зум 3000"; без числа или 0 = стандарт
function CF_ZoomCmd takes player cf_p,string cf_m returns nothing
local string cf_s=StringCase(cf_m,false)
local integer cf_k=CF_Find(cf_s,"zoom")
local integer cf_l=4
local string cf_r
local integer cf_v
local integer cf_o=CF_Zoom[GetPlayerId(cf_p)]
if cf_k<0 or cf_k>1 then
set cf_l=StringLength("зум")
set cf_k=CF_Find(cf_s,"зум")
if cf_k<0 then
set cf_k=CF_Find(cf_s,"Зум")
endif
if cf_k<0 then
set cf_k=CF_Find(cf_s,"ЗУМ")
endif
endif
if cf_k<0 or cf_k>1 then
return
endif
set cf_r=SubString(cf_s,cf_k+cf_l,StringLength(cf_s))
loop
exitwhen SubString(cf_r,0,1)!=" "
set cf_r=SubString(cf_r,1,StringLength(cf_r))
endloop
if cf_r=="" then
set cf_v=0
else
set cf_v=S2I(cf_r)
if cf_v==0 and SubString(cf_r,0,1)!="0" then
call DisplayTimedTextToPlayer(cf_p,0,0,10.,"|cffFF0000Зум:|r напишите, например, |cffFFFF00зум 1500|r (от 500 до 5000). |cffFFFF00зум 0|r возвращает стандарт.")
return
endif
endif
if cf_v>0 and cf_v<500 then
set cf_v=500
elseif cf_v>5000 then
set cf_v=5000
endif
call CF_ZoomSet(cf_p,cf_v)
if cf_v!=cf_o then
if cf_v==0 then
call DisplayTimedTextToPlayer(cf_p,0,0,6.,"|cffC6FF00Зум|r: стандартный (1650)")
else
call DisplayTimedTextToPlayer(cf_p,0,0,6.,"|cffC6FF00Зум|r установлен: |cffFFFF00"+I2S(cf_v)+"|r (500-5000, стандарт 1650)")
endif
endif
endfunction
function CF_ZoomEvt takes nothing returns nothing
call CF_ZoomCmd(GetTriggerPlayer(),GetEventPlayerChatString())
endfunction
// босс ходит по своей дороге, но не дальше 1500 от центра (к замкам не выходит)
function CF_BossLeash takes nothing returns nothing
local real dx
local real dy
if CF_Boss==null or GetWidgetLife(CF_Boss)<=.405 then
return
endif
set dx=GetUnitX(CF_Boss)
set dy=GetUnitY(CF_Boss)-CF_BossY
if SquareRoot(dx*dx+dy*dy)>1500. then
call IssuePointOrder(CF_Boss,"move",0.,CF_BossY)
endif
endfunction
function CF_Init takes nothing returns nothing
local trigger t=CreateTrigger()
local integer cf_i=0
set CF_ID[1]='AId1'
set CF_ID[2]='AId2'
set CF_ID[3]='AId3'
set CF_ID[4]='AId4'
set CF_ID[5]='AId5'
set CF_ID[7]='AId7'
''' + ''.join("set CF_QA[%d]='%s'\n" % (v, qid(v)) for v in range(1, QMAX + 1)) + ''.join("call SaveInteger(CF_HD,0,'%s',%d)\n" % (u, d) for u, d in BASE_DMG.items()) + '''''' + ''.join("set CF_BossT[%d]='%s'\n" % (i, b) for i, b in enumerate(BOSS_IDS)) + 'set CF_BossN=%d\n' % len(BOSS_IDS) + '''call TriggerRegisterAnyUnitEventBJ(t,EVENT_PLAYER_UNIT_SPELL_EFFECT)
call TriggerAddAction(t,function CF_OnSpell)
set t=CreateTrigger()
call TriggerRegisterTimerExpireEvent(t,CF_BossTm)
call TriggerAddAction(t,function CF_BossSpawn)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,1.5)
call TriggerAddAction(t,function CF_BossLeash)
set t=CreateTrigger()
loop
exitwhen cf_i>11
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"zoom",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"Zoom",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"ZOOM",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"зум",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"Зум",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"ЗУМ",false)
set cf_i=cf_i+1
endloop
call TriggerAddAction(t,function CF_ZoomEvt)
set CF_DlgF=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgF)
call TriggerAddAction(t,function CF_MenuFogClick)
set CF_DlgC=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgC)
call TriggerAddAction(t,function CF_MenuCoinClick)
set CF_DlgG=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgG)
call TriggerAddAction(t,function CF_MenuGoldClick)
set CF_DlgB=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgB)
call TriggerAddAction(t,function CF_MenuBotsClick)
set CF_DlgA=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgA)
call TriggerAddAction(t,function CF_MenuBotsClick)
set CF_DlgD=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgD)
call TriggerAddAction(t,function CF_MenuBotsClick)
set cf_i=0
loop
exitwhen cf_i>11
set CF_CDlg[cf_i]=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_CDlg[cf_i])
call TriggerAddAction(t,function CF_CmdClick)
set cf_i=cf_i+1
endloop
//RSJ_INIT
set t=CreateTrigger()
call TriggerRegisterTimerEventSingle(t,5.)
call TriggerAddAction(t,function CF_MenuStart)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,2.)
call TriggerAddAction(t,function CF_ForgeLvlAll)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,1.)
call TriggerAddAction(t,function CF_Recount)
set t=null
endfunction
'''
# v30: меню старта (туман, монетки, бюджет) открывается вместе с концом окна команд, а не раньше: иначе диалог перекрыл бы ввод в чат
if not VER.startswith('test'):
    _mt = 'call TriggerRegisterTimerEventSingle(t,5.)\ncall TriggerAddAction(t,function CF_MenuStart)'
    assert _mt in CF_FUNCS, 'таймер меню старта не найден'
    CF_FUNCS = CF_FUNCS.replace(_mt, _mt.replace('(t,5.)', f'(t,{CF_WIN}.)'))
TEST = VER.startswith('test')
# командиры: в тестовых сборках без диалогов и с записью в лог (Preload), в релизе метки пустые
_LE = 'call PreloadGenEnd("Logs' + chr(92) * 2 + 'cftest.txt")' + chr(10)
if TEST:
    if not VER.startswith('testz'):   # testz = тест с включённым диалогом командира (кликаем мышью из _smoke_click.ps1)
        j = j.replace('boolean CF_CmdNoDlg=false', 'boolean CF_CmdNoDlg=true')
    j = j.replace('//CMDLOG_CLICK', 'call Preload("CMDCLICK p="+I2S(cf_p)+" k="+I2S(cf_k))' + chr(10) + _LE)
    j = j.replace('//CMDLOG_UP', 'if LoadInteger(CF_HD,5,p)<12 then\ncall SaveInteger(CF_HD,5,p,LoadInteger(CF_HD,5,p)+1)\n'
                  'call Preload("CMD up p="+I2S(p)+" cmd="+I2S(CF_Cmd[p])+" fa="+I2S(CF_FA[p])+" a="+I2S(cf_a)+" as="+I2S(GetUnitAbilityLevel(u,' + chr(39) + 'Cc01' + chr(39) + '))+" ev="+I2S(GetUnitAbilityLevel(u,' + chr(39) + 'Cc02' + chr(39) + '))+" cr="+I2S(GetUnitAbilityLevel(u,' + chr(39) + 'Cc03' + chr(39) + ')))\n' + _LE + 'endif')
    j = j.replace('//SPLOG_GOLD', 'set CF_SpG[p]=CF_SpG[p]+' + str(RS.SP_GOLD) + '*cf_k')
    j = j.replace('//CMDLOG_F', 'set CF_IncSum[D-1]=CF_IncSum[D-1]+F' + chr(10) + 'if LoadInteger(CF_HD,9,D)<400 then\ncall SaveInteger(CF_HD,9,D,LoadInteger(CF_HD,9,D)+1)\n'
                  'call Preload("INC p="+I2S(D-1)+" cmd="+I2S(CF_Cmd[D-1])+" base="+I2S(jI(D))+" F="+I2S(F)+" m="+R2S(m))\n' + _LE + 'endif')
    j = j.replace('//CMDLOG_INC', 'if LoadInteger(CF_HD,6,D)<5 then\ncall SaveInteger(CF_HD,6,D,LoadInteger(CF_HD,6,D)+1)\n'
                  'call Preload("CMD inc p="+I2S(D-1)+" cmd="+I2S(CF_Cmd[D-1])+" m="+R2S(m))\n' + _LE + 'endif')
else:
    j = j.replace('//CMDLOG_UP', '').replace('//CMDLOG_INC', '').replace('//CMDLOG_CLICK', '').replace('//CMDLOG_F', '').replace('//SPLOG_GOLD', '')
if VER.endswith('nm') or VER.endswith('nmlog'):
    j = j.replace('boolean CF_MenuOn=true', 'boolean CF_MenuOn=false')
if TEST and not VER.startswith('testm'):
    j = j.replace('boolean CF_MenuOn=true', 'boolean CF_MenuOn=false')
if VER.startswith('testm'):
    NL = chr(10)
    LOGEND = 'call PreloadGenEnd("Logs' + chr(92) * 2 + 'cftest.txt")' + NL
    ML = lambda t: 'call Preload("' + t + '")' + NL + LOGEND
    _h = 'function CF_Menu takes nothing returns nothing' + NL + 'local real cf_w=0.' + NL
    assert _h in j
    j = j.replace(_h, _h + ML('M enter') + 'call Preload("M slot="+I2S(GetHandleId(GetPlayerSlotState(Player(0))))+" on="+I2S(IntegerTertiaryOp(CF_MenuOn,1,0)))' + NL + LOGEND)
    _a = 'call DialogDisplay(Player(0),CF_DlgF,true)' + NL
    assert _a in j
    j = j.replace(_a, _a + ML('M fog shown'))
    _b = 'call DialogDisplay(Player(0),CF_DlgF,false)' + NL
    j = j.replace(_b, ML('M fog done') + _b)
    CF_FUNCS = CF_FUNCS.replace('call TriggerRegisterTimerEventSingle(t,5.)' + NL + 'call TriggerAddAction(t,function CF_MenuStart)', 'call TriggerRegisterTimerEventSingle(t,6.)' + NL + 'call TriggerAddAction(t,function CF_MenuStart)')



def race_test_steps():
    # проверка умения каждой расы настоящим приказом строителю (как клик игрока):
    # враги игрока 6 разной брони стоят на паузе, свой боец игрока 0 рядом; в лог пишем здоровье и эффекты
    q = chr(39)
    foes = []
    for dt in ('medium', 'large', 'none', 'small', 'divine'):
        u = next((r['u'] for r in rows if r['dps'] and not r['fly'] and C.stat(U, r['u'], 'udty') == dt), None)
        if u:
            foes.append((dt, u))
    hp = '+'.join('" %s="+R2S(GetUnitLifePercent(CF_RE[%d]))' % (dt, i) for i, (dt, u) in enumerate(foes))
    st = ['set CF_T=400.']
    for ri, (bid, rn) in enumerate(RACES):
        nm, ico, tt, kind, par, tip = SKILL[rn]
        ex, ey = (0., 0.) if kind == 'mine' else (-1500., -1500.)
        mk = ''.join("set CF_RE[%d]=CreateUnit(Player(6),%s%s%s,%.0f.+%d.,%.0f.,180.)\ncall PauseUnit(CF_RE[%d],true)\n"
                     % (i, q, u, q, ex, 60 * i, ey, i) for i, (dt, u) in enumerate(foes))
        order = ('call IssuePointOrder(CF_RB,"%s",%.0f.+120.,%.0f.)' % (race_order(tt), ex, ey) if tt == 2
                 else 'call IssueImmediateOrder(CF_RB,"innerfire")')
        st.append(
            'call CF_RClean()\n'
            'set CF_RB=CreateUnit(Player(0),%s%s%s,-2200.,-1500.,0.)\n' % (q, bid, q) +
            'set CF_TU=CreateUnit(Player(0),%s%s%s,-2300.,-1500.,0.)\n' % (q, TESTU, q) +
            mk +
            'call CF_Log("R%d %s ab=%s"+I2S(GetUnitAbilityLevel(CF_RB,%sCr%02d%s))+" speed="+R2S(GetUnitMoveSpeed(CF_RE[0])))\n'
            % (ri, rn, '', q, ri, q) + order + '\ncall CF_Log("order="+I2S(GetUnitCurrentOrder(CF_RB)))')
        st.append(
            'call CF_Log("R%d %s cast"+%s+" speed="+R2S(GetUnitMoveSpeed(CF_RE[0]))+" own_dmg="+I2S(GetUnitAbilityLevel(CF_TU,%sCbd1%s)+GetUnitAbilityLevel(CF_TU,%sCbd2%s)+GetUnitAbilityLevel(CF_TU,%sCbd3%s)+GetUnitAbilityLevel(CF_TU,%sCbd4%s)+GetUnitAbilityLevel(CF_TU,%sCbd5%s)+GetUnitAbilityLevel(CF_TU,%sCbd6%s))+" as="+I2S(GetUnitAbilityLevel(CF_TU,%sCbs1%s))+" evade="+I2S(GetUnitAbilityLevel(CF_TU,%sCbe1%s))+" armor="+I2S(GetUnitAbilityLevel(CF_TU,%sAId5%s))+" cd="+I2S(IntegerTertiaryOp(GetUnitAbilityLevel(CF_RB,%sCr%02d%s)>0,1,0)))'
            % ((ri, rn, hp) + (q, q) * 9 + (q, ri, q)))
        if kind == 'evade':
            st += ['call DoNothing()'] * 3
            st.append('call CF_Log("R%d after evade="+I2S(GetUnitAbilityLevel(CF_TU,%sCbe1%s)))' % (ri, q, q))
        if kind == 'infect':
            st.append('call DoNothing()')
            st.append('call CF_Log("R%d %s later"+%s)' % (ri, rn, hp))
    # артиллерия по бегущей цели: враг ходит туда-обратно поперёк линии огня, стрелок бьёт сам
    tgt = next(u for dt, u in foes if dt == 'large')
    for u in sorted(set(ART_UNITS)):
        rng = C.stat(U, u, 'ua1r') or 600
        d = min(int(rng), 900) - 80
        x0, y0 = -2600, -1500
        # цель бегает быстро (400) по дуге в радиусе огня; считаем выстрелы стрелка и попадания по цели
        st.append('call CF_RClean()\nset CF_RB=CreateUnit(Player(0),%s%s%s,%d.,%d.,0.)\n' % (q, u, q, x0, y0) +
                  'set CF_RE[0]=CreateUnit(Player(6),%s%s%s,%d.,%d.,180.)\n' % (q, tgt, q, x0 + d, y0) +
                  'call SetUnitMoveSpeed(CF_RE[0],400.)\nset CF_AA=0\nset CF_AH=0\n'
                  'call TriggerRegisterUnitEvent(CF_HT,CF_RE[0],EVENT_UNIT_DAMAGED)\n'
                  'call IssueTargetOrder(CF_RB,"attack",CF_RE[0])\n'
                  'call IssuePointOrder(CF_RE[0],"move",%d.,%d.)' % (x0 + d * 0.7, y0 + d * 0.7))
        for i in range(5):
            yy = y0 - d * 0.7 if i % 2 == 0 else y0 + d * 0.7
            st.append('call IssuePointOrder(CF_RE[0],"move",%d.,%d.)' % (x0 + d * 0.7, yy))
        st.append('call CF_Log("ART %s range=%d shots="+I2S(CF_AA)+" hits="+I2S(CF_AH)+" hp%%="+R2S(GetUnitLifePercent(CF_RE[0])))' % (u, rng))
    st.append('call CF_RClean()\ncall CF_Log("FINISH")')
    return st


def bot_test_steps():
    # защита замка ботом (игрок 6) за каждую расу: ремонт, Сфера молний, Спасительный удар при замке < 20%
    q = chr(39)
    tgt = next(r['u'] for r in rows if r['dps'] and not r['fly'] and C.stat(U, r['u'], 'udty') == 'large')
    cs = 'CF_Castle(Fi[7])'
    full = 'call SetWidgetLife(%s,GetUnitState(%s,UNIT_STATE_MAX_LIFE))' % (cs, cs)
    ehp = '+'.join('" e%d="+R2S(GetUnitLifePercent(CF_RE[%d]))' % (i, i) for i in range(7))
    st = ['set CF_T=400.']
    for ri, (bid, rn) in enumerate(RACES):
        mk = ''.join("set CF_RE[%d]=CreateUnit(Player(0),%s%s%s,4300.,%d.,0.)\ncall PauseUnit(CF_RE[%d],true)\n"
                     % (i, q, tgt, q, -300 + 100 * i, i) for i in range(7))
        st.append('call CF_RClean()\n%s\n' % full +
                  'set CF_RB=CreateUnit(Player(6),%s%s%s,4300.,600.,180.)\n' % (q, bid, q) +
                  'set CF_BotB[6]=CF_RB\nset CF_BotR[6]=%d\nset CF_BotNext[6]=99999.\n' % ri +
                  'call SetWidgetLife(%s,GetUnitState(%s,UNIT_STATE_MAX_LIFE)*.8)\n' % (cs, cs) +
                  'call CF_BotDefend(6,CF_RB)\n'
                  'call CF_Log("D%d %s repair order="+I2S(GetUnitCurrentOrder(CF_RB))+" castle="+R2S(GetUnitLifePercent(%s)))' % (ri, rn, cs))
        st.append('call DoNothing()')
        st.append('call CF_Log("D%d castle_after_repair="+R2S(GetUnitLifePercent(%s)))\n%s\n' % (ri, cs, full) + mk +
                  'call SetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD,600)\ncall CF_BotDefend(6,CF_RB)\n'
                  'call CF_Log("D%d orb="+I2S(IntegerTertiaryOp(CF_BotOrb(CF_RB)!=null,1,0))+" gold="+I2S(GetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD))+" near="+I2S(CF_BotNear(6,1200.)))' % ri)
        st.append('call CF_Log("D%d orb_hit"+%s)' % (ri, ehp))
        st.append(''.join('call RemoveUnit(CF_RE[%d])\nset CF_RE[%d]=null\n' % (i, i) for i in range(3, 7)) +
                  'call SetWidgetLife(%s,GetUnitState(%s,UNIT_STATE_MAX_LIFE)*.15)\n' % (cs, cs) +
                  'call CF_BotDefend(6,CF_RB)\n'
                  'call CF_Log("D%d low castle order="+I2S(GetUnitCurrentOrder(CF_RB))+" near="+I2S(CF_BotNear(6,1200.)))' % ri)
        st.append('call DoNothing()')
        st.append('call CF_Log("D%d strike_used="+I2S(1-GetUnitAbilityLevel(CF_RB,%sA005%s))+" e0="+R2S(GetUnitLifePercent(CF_RE[0]))+" e1="+R2S(GetUnitLifePercent(CF_RE[1]))+" e2="+R2S(GetUnitLifePercent(CF_RE[2])))\n%s' % (ri, q, q, full))
    st.append('call CF_RClean()\ncall CF_Log("FINISH")')
    return st


SBF = ''
if TEST:
    # автопрогон: сам выбирает режим, затем каждые 4 с один шаг; номер шага пишется в файл (Preload)
    QID = chr(39) + TESTU + chr(39)
    summons = ','.join(f"'{u}'" for u in summon_unit.values())
    steps = [
        'set CF_BT=650.',
        'call SetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD,9000)\ncall SetPlayerState(Player(7),PLAYER_STATE_RESOURCE_GOLD,9000)',
        'call CF_Log("bots "+I2S(GetPlayerId(GetOwningPlayer(CF_BotB[6])))+" r6="+I2S(CF_BotR[6])+" r7="+I2S(CF_BotR[7]))',
        'call CF_Log("near="+I2S(CF_BotNear(6,1800.))+" hurt="+I2S(CF_BotHurt(6))+" castle="+R2S(CF_BotCastle(6)))',
        'call CF_Log("castle0 x="+R2S(GetUnitX(CF_Castle(0)))+" y="+R2S(GetUnitY(CF_Castle(0)))+" castle1 x="+R2S(GetUnitX(CF_Castle(1)))+" y="+R2S(GetUnitY(CF_Castle(1))))',
        'if CF_BotAim(6) then\ncall CF_Log("aim yes")\nelse\ncall CF_Log("aim no")\nendif',
        'set CF_BT=1300.',
        'call SetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD,9000)',
    ] + ['call DoNothing()'] * 8 + [
        'call CF_BossSpawn()',
        'call CF_Log("boss x="+R2S(GetUnitX(CF_Boss))+" y="+R2S(GetUnitY(CF_Boss))+" road_nobuild="+I2S(IntegerTertiaryOp(IsTerrainPathable(-3000.,832.,PATHING_TYPE_BUILDABILITY),1,0))+" grass_nobuild="+I2S(IntegerTertiaryOp(IsTerrainPathable(-3072.,0.,PATHING_TYPE_BUILDABILITY),1,0)))',
        'set CF_TU=CreateUnit(Player(0),' + QID + ',-60.,CF_BossY,0.)',
        'call DoNothing()',
        'call DoNothing()',
        'call CF_Log("T0 boss="+R2S(GetUnitLifePercent(CF_Boss))+" unit0="+R2S(GetUnitLifePercent(CF_TU)))\ncall RemoveUnit(CF_TU)\nset CF_TU=CreateUnit(Player(6),' + QID + ',-60.,CF_BossY,0.)',
        'call DoNothing()',
        'call DoNothing()',
        'call CF_Log("T1 boss="+R2S(GetUnitLifePercent(CF_Boss))+" unit1="+R2S(GetUnitLifePercent(CF_TU))+" name="+GetUnitName(CF_Boss))',
        # --- умения рас: баффы, замедление, чума, мина, заражение ---
        'call RemoveUnit(CF_TU)\nset CF_TU=CreateUnit(Player(0),' + QID + ',-3000.,0.,0.)\nset CF_TU2=CreateUnit(Player(6),' + QID + ',3000.,0.,0.)\ncall CF_BuffDmg(0,6.)\ncall CF_Buff(0,\'Apiv\',6.)\ncall CF_Buff(0,\'Cbs1\',6.)\ncall CF_Buff(0,\'AId5\',6.)\ncall CF_Slow(0,6.)\ncall CF_Plague(CF_TU,.10)',
        'call CF_Log("BUFF dmg="+I2S(GetUnitAbilityLevel(CF_TU,\'Cbd1\')+GetUnitAbilityLevel(CF_TU,\'Cbd2\')+GetUnitAbilityLevel(CF_TU,\'Cbd3\')+GetUnitAbilityLevel(CF_TU,\'Cbd4\')+GetUnitAbilityLevel(CF_TU,\'Cbd5\')+GetUnitAbilityLevel(CF_TU,\'Cbd6\'))+" as="+I2S(GetUnitAbilityLevel(CF_TU,\'Cbs1\'))+" invis_ab="+I2S(GetUnitAbilityLevel(CF_TU,\'Apiv\'))+" invis_for_enemy="+I2S(IntegerTertiaryOp(IsUnitInvisible(CF_TU,Player(6)),1,0))+" armor="+I2S(GetUnitAbilityLevel(CF_TU,\'AId5\')))\ncall CF_Log("ENEMY speed="+R2S(GetUnitMoveSpeed(CF_TU2))+" default="+R2S(GetUnitDefaultMoveSpeed(CF_TU2))+" hp%="+R2S(GetUnitLifePercent(CF_TU2)))',
        'call DoNothing()',
        'call DoNothing()',
        'call DoNothing()',
        'call CF_Log("AFTER dmg="+I2S(GetUnitAbilityLevel(CF_TU,\'Cbd1\')+GetUnitAbilityLevel(CF_TU,\'Cbd2\')+GetUnitAbilityLevel(CF_TU,\'Cbd3\')+GetUnitAbilityLevel(CF_TU,\'Cbd4\')+GetUnitAbilityLevel(CF_TU,\'Cbd5\')+GetUnitAbilityLevel(CF_TU,\'Cbd6\'))+" as="+I2S(GetUnitAbilityLevel(CF_TU,\'Cbs1\'))+" invis_ab="+I2S(GetUnitAbilityLevel(CF_TU,\'Apiv\'))+" armor="+I2S(GetUnitAbilityLevel(CF_TU,\'AId5\'))+" enemy_speed="+R2S(GetUnitMoveSpeed(CF_TU2)))\ncall CF_Mine(CF_TU,9000.,100.)',
        'call CF_Log("MINE enemy hp%="+R2S(GetUnitLifePercent(CF_TU2)))\ncall CF_Infect(CF_TU,3000.,0.,300.,30.)',
        'call DoNothing()',
        'call DoNothing()',
        'call CF_Log("INFECT enemy hp%="+R2S(GetUnitLifePercent(CF_TU2)))',
        'call CF_Log("late se6="+I2S(IntegerTertiaryOp(se[7],1,0))+" b6="+I2S(GetUnitTypeId(CF_BotB[6]))+" r6="+I2S(CF_BotR[6])+" castle="+R2S(CF_BotCastle(6))+" near="+I2S(CF_BotNear(6,1800.)))',
        'call CF_Log("FA6="+I2S(CF_FA[6])+" FD6="+I2S(CF_FD[6])+" FE6="+I2S(CF_FE[6])+" FA7="+I2S(CF_FA[7]))',
        'call CF_Log("FINISH")',
    ]
    if VER.startswith('testf2'):
        # в тестовой игре союзник 7 пустой слот: только здесь не проверяем, что союзник в игре
        CF_FUNCS = CF_FUNCS.replace('and GetPlayerSlotState(Player(cf_q))==PLAYER_SLOT_STATE_PLAYING then', ' then')
        j = j.replace('and GetPlayerSlotState(Player(cf_q))==PLAYER_SLOT_STATE_PLAYING then', ' then')
    if VER.startswith('testf'):
        # кузница v16: игрок 6 качает атаку 3, броню 3, экономику 3 (+4-я попытка выше максимума);
        # боец 6 должен получить +24% урона и +3 брони, боец союзника 7 половину уровня 3: +4% и +1
        bd = BASE_DMG.get(TESTU, 30)
        v6, v7 = max(1, int(bd * .24 + .5)), max(1, int(bd * .04 + .5))
        lv = lambda u, a: 'I2S(GetUnitAbilityLevel(%s,%s%s%s))' % (u, chr(39), a, chr(39))
        steps = [
            'call SetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD,9000)\n' + 'call CF_Forge(6,0)\n' * 3 + 'call CF_Forge(6,1)\n' * 3 + 'call CF_Forge(6,2)\n' * 4,
            'call CF_ForgeLvl(6)\ncall CF_Log("F levels FA6="+I2S(CF_FA[6])+" FD6="+I2S(CF_FD[6])+" FE6="+I2S(CF_FE[6])+" gold="+I2S(GetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD))+" btn="+'
            + lv('CF_BotB[6]', 'Cf01') + '+"/"+' + lv('CF_BotB[6]', 'Cf02') + '+"/"+' + lv('CF_BotB[6]', 'Cf03') + ')',
            'set CF_TU=CreateUnit(Player(6),' + QID + ',3000.,0.,0.)\ncall CF_Up(CF_TU)\nset CF_TU2=CreateUnit(Player(7),' + QID + ',3000.,200.,0.)\ncall CF_Up(CF_TU2)\n'
            'call CF_Log("F base=' + str(bd) + ' hd="+I2S(LoadInteger(CF_HD,0,' + QID + '))+" u6 atk=' + qid(v6) + ':"+' + lv('CF_TU', qid(v6)) + '+" arm3="+' + lv('CF_TU', 'AId3')
            + '+" u7 atk=' + qid(v7) + ':"+' + lv('CF_TU2', qid(v7)) + '+" arm1="+' + lv('CF_TU2', 'AId1') + '+" slot7="+I2S(GetHandleId(GetPlayerSlotState(Player(7)))))',
            'call CF_Log("FINISH")',
        ]
    elif VER.startswith('testh'):
        j = j.replace('integer CF_Start=250', 'integer CF_Start=1000')
        steps = ['call DoNothing()', 'call CF_Log("H gold p0="+I2S(GetPlayerState(Player(0),PLAYER_STATE_RESOURCE_GOLD))+" p6="+I2S(GetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD)))', 'call CF_Log("FINISH")']
    elif VER.startswith('testw'):
        # цепная атака Ведьмака (h00U): бьёт здание A, здания B и C стоят за ним; смотрим, достаётся ли им
        HB = chr(39) + 'h047' + chr(39)
        HW = chr(39) + 'h00U' + chr(39)
        life = lambda u: 'R2S(GetUnitLifePercent(' + u + '))'
        steps = [
            'set CF_TU=CreateUnit(Player(0),' + HB + ',2000.,0.,0.)\nset CF_TU2=CreateUnit(Player(0),' + HB + ',2150.,0.,0.)\nset CF_TU3=CreateUnit(Player(0),' + HB + ',2300.,0.,0.)\nset CF_TU4=CreateUnit(Player(6),' + HW + ',1650.,0.,0.)\ncall IssueTargetOrder(CF_TU4,"attack",CF_TU)',
            'call DoNothing()', 'call DoNothing()',
            'call CF_Log("W t12 A="+' + life('CF_TU') + '+" B="+' + life('CF_TU2') + '+" C="+' + life('CF_TU3') + ')',
            'call DoNothing()', 'call DoNothing()',
            'call CF_Log("W t24 A="+' + life('CF_TU') + '+" B="+' + life('CF_TU2') + '+" C="+' + life('CF_TU3') + '+" witch="+' + life('CF_TU4') + ')',
            'call CF_Log("FINISH")',
        ]
    elif VER.startswith('testu'):
        # лимит юнитов: потолок 20, игроку 6 заказываем 40 бойцов, игроку 0 десять
        j = j.replace('integer CF_UCap=500', 'integer CF_UCap=20')
        steps = [
            'call CF_Summon(6,' + QID + ',40)\ncall CF_Summon(0,' + QID + ',10)\ncall CF_Recount()\ncall CF_Log("U a uc6="+I2S(CF_UC[6])+" uc0="+I2S(CF_UC[0])+" lim6="+I2S(IntegerTertiaryOp(CF_Lim[6],1,0))+" lim0="+I2S(IntegerTertiaryOp(CF_Lim[0],1,0)))',
            'call DoNothing()',
            'call CF_Recount()\ncall CF_Log("U b uc6="+I2S(CF_UC[6])+" uc0="+I2S(CF_UC[0]))',
            'call CF_Log("FINISH")',
        ]
    elif VER.startswith('testg'):
        # v18: награда и линии боссов, атака босса по воздуху, зум
        G = lambda i: 'I2S(GetPlayerState(Player(%d),PLAYER_STATE_RESOURCE_GOLD))' % i
        kill = 'set CF_TU=CreateUnit(Player(0),' + QID + ',-60.,CF_BossY,0.)\ncall UnitDamageTarget(CF_TU,CF_Boss,999999.,false,false,ATTACK_TYPE_CHAOS,DAMAGE_TYPE_UNIVERSAL,WEAPON_TYPE_WHOKNOWS)'
        spawn = lambda n: ('call CF_BossSpawn()\ncall CF_Log("G spawn n=' + str(n) + ' idx="+I2S(CF_BossIdx)+" rew="+I2S(CF_BossRew)+" lane="+I2S(CF_BossLane)+" y="+R2S(CF_BossY)+" name="+GetUnitName(CF_Boss))')
        zl = lambda cmd: 'call CF_ZoomCmd(Player(0),"' + cmd + '")\ncall CF_Log("G zoom after [' + cmd + '] val="+I2S(CF_Zoom[0]))'
        steps = [
            'call CF_Log("G gold before p0="+' + G(0) + '+" p1="+' + G(1) + '+" p6="+' + G(6) + '+" p7="+' + G(7) + ')',
            spawn(1),
            'set CF_TU2=CreateUnit(Player(6),\'hgry\',-100.,CF_BossY,0.)\ncall UnitRemoveAbility(CF_TU2,\'Aatk\')\ncall SetUnitInvulnerable(CF_Boss,false)\ncall CF_Log("G air created hp="+R2S(GetUnitLifePercent(CF_TU2))+" boss="+GetUnitName(CF_Boss))',
            'call DoNothing()',
            'call DoNothing()',
            'call DoNothing()',
            'call CF_Log("G air after 12s hp%="+R2S(GetUnitLifePercent(CF_TU2))+" alive="+I2S(IntegerTertiaryOp(GetWidgetLife(CF_TU2)>.405,1,0))+" bossx="+R2S(GetUnitX(CF_Boss)))',
            'call CF_Log("G gold pre-kill p0="+' + G(0) + '+" p1="+' + G(1) + '+" p6="+' + G(6) + '+" p7="+' + G(7) + ')\n' + kill,
            'call CF_Log("G gold post-kill1 p0="+' + G(0) + '+" p1="+' + G(1) + '+" p6="+' + G(6) + '+" p7="+' + G(7) + '+" boss_null="+I2S(IntegerTertiaryOp(CF_Boss==null,1,0)))',
            spawn(2),
            'call CF_Log("G gold pre-kill2 p0="+' + G(0) + ')\n' + kill,
            'call CF_Log("G gold post-kill2 p0="+' + G(0) + ')',
            spawn(3),
            kill,
            spawn(4),
            kill,
            'call CF_Log("G gold end p0="+' + G(0) + '+" p6="+' + G(6) + ')',
            zl('зум 1500'),
            'call CF_Log("G cam dist="+R2S(GetCameraField(CAMERA_FIELD_TARGET_DISTANCE)))',
            zl('-zoom 9999'),
            zl('Зум 700'),
            zl('zoom abc'),
            zl('зум'),
            zl('-ZOOM 2000'),
            'call CF_Log("G cam dist="+R2S(GetCameraField(CAMERA_FIELD_TARGET_DISTANCE)))',
            'call CF_Log("FINISH")',
        ]
    elif VER.startswith('testi'):
        # v24: два новых предмета. Покупка в тесте = выдача строителю (UnitAddItemById), применение = настоящий UnitUseItem.
        # Слабость: считаем атаки врага (CF_AA, событие ATTACKED игрока 6) за 10 с до и после; Купол: неуязвимость зданий и замка.
        q = chr(39)
        lv = lambda u, a: 'I2S(GetUnitAbilityLevel(%s,%s%s%s))' % (u, q, a, q)
        pct = lambda u: 'R2S(GetUnitLifePercent(%s))' % u
        spd = lambda u: 'R2S(GetUnitMoveSpeed(%s))' % u
        cs0 = 'CF_Castle(Fi[7])'
        use = 'call SetUnitPosition(CF_TU2,1500.,0.)\ncall UnitUseItem(CF_TU2,UnitItemInSlot(CF_TU2,0))'
        hit = lambda u: 'call UnitDamageTarget(CF_RB,%s,100.,false,false,ATTACK_TYPE_CHAOS,DAMAGE_TYPE_UNIVERSAL,WEAPON_TYPE_WHOKNOWS)' % u
        steps = ['call DoNothing()'] * 3 + [
            # враг-атакующий CF_RB (игрок 6) бьёт жертву CF_TU (игрок 0, много здоровья); строитель CF_TU2 (игрок 0) в 800 от врага; CF_TU3 враг далеко
            'set CF_RB=CreateUnit(Player(0),' + QID + ',2000.,0.,180.)\ncall SetUnitState(CF_RB,UNIT_STATE_MAX_LIFE,90000.)\ncall SetWidgetLife(CF_RB,90000.)\n'
            'set CF_TU=CreateUnit(Player(6),' + QID + ',1900.,0.,0.)\ncall SetUnitState(CF_TU,UNIT_STATE_MAX_LIFE,90000.)\ncall SetWidgetLife(CF_TU,90000.)\n'
            'set CF_TU2=CreateUnit(Player(6),' + q + 'h00C' + q + ',1200.,0.,0.)\nset CF_TU3=CreateUnit(Player(0),' + QID + ',2000.,2500.,0.)\ncall PauseUnit(CF_TU3,true)\n'
            'call UnitAddItemById(CF_TU2,' + q + 'I00E' + q + ')\ncall IssueTargetOrder(CF_RB,"attack",CF_TU)',
            'call CF_Log("I item0="+GetItemName(UnitItemInSlot(CF_TU2,0))+" speed_near="+' + spd('CF_RB') + '+" speed_far="+' + spd('CF_TU3') + ')\nset CF_AA=0',
            'call IssueTargetOrder(CF_RB,"attack",CF_TU)', 'call IssueTargetOrder(CF_RB,"attack",CF_TU)', 'call IssueTargetOrder(CF_RB,"attack",CF_TU)', 'call IssueTargetOrder(CF_RB,"attack",CF_TU)',
            'call CF_Log("I W0 attacks_10s="+I2S(CF_AA)+" enemy="+I2S(IntegerTertiaryOp(IsUnitEnemy(CF_RB,Player(6)),1,0))+" order="+I2S(GetUnitCurrentOrder(CF_RB))+" victim_hp%="+R2S(GetUnitLifePercent(CF_TU))+" dist="+R2S(DistanceBetweenPoints(GetUnitLoc(CF_RB),GetUnitLoc(CF_TU)))+" cdist="+R2S(DistanceBetweenPoints(GetUnitLoc(CF_TU2),GetUnitLoc(CF_RB)))+" T="+R2S(CF_T))\nset CF_AA=0\n' + use,
            'call CF_Log("I W1 used item_left="+GetItemName(UnitItemInSlot(CF_TU2,0))+" ci03_near="+' + lv('CF_RB', 'Ci03') + '+" ci03_far="+' + lv('CF_TU3', 'Ci03')
            + '+" ci03_ally="+' + lv('CF_TU', 'Ci03') + '+" speed_near="+' + spd('CF_RB') + '+" speed_far="+' + spd('CF_TU3') + '+" def="+R2S(GetUnitDefaultMoveSpeed(CF_TU3)))\ncall IssueTargetOrder(CF_RB,"attack",CF_TU)',
            'call IssueTargetOrder(CF_RB,"attack",CF_TU)', 'call IssueTargetOrder(CF_RB,"attack",CF_TU)', 'call IssueTargetOrder(CF_RB,"attack",CF_TU)',
            'call CF_Log("I W1 attacks_10s_weak="+I2S(CF_AA))',
            'call DoNothing()', 'call DoNothing()',
            'call CF_Log("I after15 ci03_near="+' + lv('CF_RB', 'Ci03') + '+" speed_near="+' + spd('CF_RB') + '+" default="+R2S(GetUnitDefaultMoveSpeed(CF_RB)))',
            'call SetUnitPosition(CF_TU2,1500.,0.)\ncall CF_Weaken(6,CF_TU2,1400.,15.)',
            'call CF_Log("I direct ci03_near="+' + lv('CF_RB', 'Ci03') + '+" speed_near="+' + spd('CF_RB') + '+" ci03_far="+' + lv('CF_TU3', 'Ci03') + ')',
            # купол: строитель рядом с замком своей команды, свои здания рядом, замок
            'call SetUnitPosition(CF_TU2,GetUnitX(' + cs0 + ')*.85,0.)\nset CF_TU4=CreateUnit(Player(6),' + q + 'h047' + q + ',GetUnitX(CF_TU2),300.,0.)\ncall UnitAddItemById(CF_TU2,' + q + 'I00F' + q + ')\n'
            'call CF_Log("I D0 item="+GetItemName(UnitItemInSlot(CF_TU2,0))+" castle_owner="+I2S(GetPlayerId(GetOwningPlayer(' + cs0 + ')))+" castle_dist="+R2S(DistanceBetweenPoints(GetUnitLoc(CF_TU2),GetUnitLoc(' + cs0 + ')))+" bld="+' + pct('CF_TU4') + '+" castle="+' + pct(cs0) + ')',
            'call UnitUseItem(CF_TU2,GetItemOfTypeFromUnitBJ(CF_TU2,' + q + 'I00F' + q + '))',
            'call CF_Log("I D1 avul_bld="+' + lv('CF_TU4', 'Avul') + '+" avul_castle="+' + lv(cs0, 'Avul') + '+" item_left="+GetItemName(UnitItemInSlot(CF_TU2,0)))\n'
            + hit('CF_TU4') + '\n' + hit(cs0) + '\ncall CF_Log("I D1 after_hit bld="+' + pct('CF_TU4') + '+" castle="+' + pct(cs0) + ')',
            'call DoNothing()', 'call DoNothing()', 'call DoNothing()',
            'call CF_Log("I D2 avul_bld="+' + lv('CF_TU4', 'Avul') + '+" avul_castle="+' + lv(cs0, 'Avul') + ')\n'
            + hit('CF_TU4') + '\n' + hit(cs0) + '\ncall CF_Log("I D2 after_hit bld="+' + pct('CF_TU4') + '+" castle="+' + pct(cs0) + ')',
            'call CF_Log("FINISH")',
        ]
    elif VER.startswith('testj'):
        # v24: интерфейс замка: выбираем свой замок, внешний скрипт (_shot_when_free.ps1) снимает окно war3 по метке "J selected"
        cs0 = 'CF_Castle(Fi[1])'
        steps = ['call DoNothing()'] * 3 + [
            'call SetPlayerState(Player(0),PLAYER_STATE_RESOURCE_GOLD,5000)\nif GetLocalPlayer()==Player(0) then\ncall ClearSelection()\ncall SelectUnit(' + cs0 + ',true)\ncall PanCameraToTimed(GetUnitX(' + cs0 + '),GetUnitY(' + cs0 + '),0.)\nendif\ncall CF_Log("J selected castle_owner="+I2S(GetPlayerId(GetOwningPlayer(' + cs0 + ')))+" name="+GetUnitName(' + cs0 + '))',
        ] + ['call DoNothing()'] * 8 + ['call CF_Log("FINISH")']
    elif VER.startswith('testn'):
        # v32: сила ботов из меню (CF_BD=30: доход бота x1.30 к базе, урон +8 ступеней) и осмысленный выбор командира ботом
        _cnt = lambda p, n: ''.join('set CF_BossRew=CF_BotPick(%d)\ncall SaveInteger(CF_HD,20,CF_BossRew,LoadInteger(CF_HD,20,CF_BossRew)+1)\n' % (p, ) for _ in range(n))
        _rd = lambda: 'call CF_Log("D picks p6 c1="+I2S(LoadInteger(CF_HD,20,1))+" c2="+I2S(LoadInteger(CF_HD,20,2))+" c3="+I2S(LoadInteger(CF_HD,20,3))+" c4="+I2S(LoadInteger(CF_HD,20,4))+" c5="+I2S(LoadInteger(CF_HD,20,5))+" c6="+I2S(LoadInteger(CF_HD,20,6))+" c0="+I2S(LoadInteger(CF_HD,20,0))+" c7="+I2S(LoadInteger(CF_HD,20,7)))'
        steps = ['call CF_Log("D cmd6="+I2S(CF_Cmd[6])+" cmd7="+I2S(CF_Cmd[7])+" bd="+I2S(CF_BD))',
                 _cnt(6, 120) + _rd(),
                 'set CF_BD=30\ncall SaveInteger(CF_HD,5,6,0)\ncall SaveInteger(CF_HD,5,7,0)\ncall SaveInteger(CF_HD,6,7,0)\ncall SaveInteger(CF_HD,6,8,0)\ncall CF_Log("D bd set "+I2S(CF_BD)+" cmd6="+I2S(CF_Cmd[6])+" cmd7="+I2S(CF_Cmd[7]))']
        steps.append('call SetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD,1300)\ncall SetPlayerState(Player(7),PLAYER_STATE_RESOURCE_GOLD,250)')
        _tl = 'call CF_Log("T pe6="+I2S(Pe[7])+" natural6="+I2S(CF_PeN[7])+" gold6="+I2S(GetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD))+" pe7="+I2S(Pe[8])+" natural7="+I2S(CF_PeN[8])+" gold7="+I2S(GetPlayerState(Player(7),PLAYER_STATE_RESOURCE_GOLD))+" He6="+GetObjectName(He[7])+" price="+I2S(Fx[GetUnitPointValueByType(He[7])])+" Jn="+GetObjectName(Je[7])+" jn="+GetObjectName(je[7])+" Ne="+I2S(Wr[7])+" be="+I2S(GetPlayerState(Player(6),PLAYER_STATE_RESOURCE_LUMBER)))'
        steps += [_tl] * 45
        steps.append('call CF_Log("D after cmd6="+I2S(CF_Cmd[6])+" cmd7="+I2S(CF_Cmd[7]))')
        steps.append('call CF_Log("FINISH")')
    elif VER.startswith('testk'):
        # командиры друзей: боты 6 и 7 получают Алика (2) и Дэна (4), потом Диму (3) и Сашу (1); в логе CMD up (бонус бойцу), CMD inc (множитель дохода), K forge (цена кузницы)
        steps = ['set CF_Cmd[6]=3\nset CF_Cmd[7]=4\nset CF_BT=650.\ncall SetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD,3000)\ncall SetPlayerState(Player(7),PLAYER_STATE_RESOURCE_GOLD,3000)',
                 'call CF_Log("K cmd6="+I2S(CF_Cmd[6])+" cmd7="+I2S(CF_Cmd[7])+" busy="+I2S(IntegerTertiaryOp(CF_CmdBusy,1,0)))']
        steps += ['call DoNothing()'] * 40
        steps.append('set CF_Cmd[6]=2\nset CF_Cmd[7]=1\nset CF_FA[6]=0\ncall SaveInteger(CF_HD,6,7,0)\ncall SaveInteger(CF_HD,6,8,0)\ncall SaveInteger(CF_HD,5,6,0)\ncall SaveInteger(CF_HD,5,7,0)\ncall SetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD,1000)\ncall CF_Forge(6,0)\n'
                     'call CF_Log("K forge alik gold="+I2S(GetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD))+" fa="+I2S(CF_FA[6]))')
        steps += ['call DoNothing()'] * 30
        # командиры Юра (5, крит) и Леша (6, уклонение): сбрасываем счётчик лога бойцов и ждём новых бойцов
        steps.append('set CF_Cmd[6]=5\nset CF_Cmd[7]=6\ncall SaveInteger(CF_HD,5,6,0)\ncall SaveInteger(CF_HD,5,7,0)')
        steps += ['call DoNothing()'] * 30
        steps.append('call CF_Log("FINISH")')
    elif VER.startswith('testo'):
        # проверка «не складываются»: по 5 зданий каждого вида у игрока 0. Ожидание: Утилизатор +6 золота за смерть (2 здания по 3), цех даёт 3 бойцам (не 7), ремонт +8% за такт (не +20%)
        q7 = chr(39)
        mk5 = lambda idd: ('call CF_SpMake(0,' + q7 + idd + q7 + ')' + chr(10)) * 5
        lg = lambda tag, expr: 'call CF_Log("O ' + tag + ' "+' + expr + ')'
        gold0 = 'I2S(GetPlayerState(Player(0),PLAYER_STATE_RESOURCE_GOLD))'
        _o = {1: mk5('cg0b') + lg('utilizers', 'CF_SpCnt(0)'), 2: 'call CF_DbSpawn(0,-2000.,-1500.)', 3: lg('gold before', gold0),
              4: 'call CF_DbKill(0,-2000.,-1500.)', 5: lg('gold after one death', gold0), 6: lg('gold after2', gold0),
              7: mk5('cg0c') + 'call CF_DbSpawn(0,-1000.,-1500.)', 8: 'call CF_DbKill(0,-1000.,-1500.)',
              9: lg('workshops=5 cgb1=', 'I2S(CF_DbCnt(0,' + q7 + 'Cgb1' + q7 + '))'),
              11: mk5('cg0d') + 'call CF_RepHurt(0)' + chr(10) + lg('stations', 'CF_SpCnt(0)')}
        for k in range(12, 26):
            _o[k] = lg('rep pct', 'CF_RepPct(0)')
        _o[26] = 'call CF_Log("FINISH")'
        steps = [_o.get(i, 'call DoNothing()') for i in range(27)]
    elif VER.startswith('testb'):
        # босс и воздух: босс бьёт воздушных юнитов разных типов у трёх игроков (0, 6, 7). Воздушные без оружия стоят рядом с боссом, через 12 с лог их здоровья
        q6 = chr(39)
        _fl = []
        for r in rows:
            if r['fly'] and r['u'] not in _fl:
                _fl.append(r['u'])
        _fl = _fl[:3] + ['cg19']
        _own = [0, 6, 7, 6]
        mk = chr(10).join("set CF_RE[%d]=CreateUnit(Player(%d),%s%s%s,-100.+%d.,CF_BossY+%d.,0.)%scall UnitRemoveAbility(CF_RE[%d],%sAatk%s)" % (i, _own[i], q6, _fl[i], q6, 40 * i, 20 * (i % 2), chr(10), i, q6, q6) for i in range(4))
        chk = '+'.join('" u%d(%s,p%d)="+R2S(GetUnitLifePercent(CF_RE[%d]))+"/"+I2S(IntegerTertiaryOp(GetWidgetLife(CF_RE[%d])>.405,1,0))' % (i, _fl[i], _own[i], i, i) for i in range(4))
        steps = ['call CF_BossSpawn()' + chr(10) + 'call SetUnitInvulnerable(CF_Boss,false)' + chr(10) + 'call CF_Log("B boss="+GetUnitName(CF_Boss)+" y="+R2S(CF_BossY))',
                 mk + chr(10) + 'call CF_Log("B air created"+' + chk + ')'] + ['call DoNothing()'] * 5 + [
                 'call CF_Log("B after 12s hp/alive"+' + chk + ')', 'call CF_Log("B after 14s hp/alive"+' + chk + ')', 'call CF_Log("FINISH")']
    elif VER.startswith('testy'):
        # особые здания Сборщиков (v26): Утилизатор +золото за павших, Сборочный цех (обломки на 1 бойца больше и дольше), Ремонтный пункт (чинит замок); игрок 0 без ботов
        q9 = chr(39)
        _y = {1: 'call CF_SpMake(0,' + q9 + 'cg0b' + q9 + ')' + chr(10) + 'call CF_SpMake(0,' + q9 + 'cg0b' + q9 + ')' + chr(10) + 'call CF_Log("Y sp0="+CF_SpCnt(0))',
              2: 'call CF_DbSpawn(0,-2000.,-1500.)', 3: 'call CF_Log("Y gold before="+I2S(GetPlayerState(Player(0),PLAYER_STATE_RESOURCE_GOLD)))',
              4: ('call CF_DbKill(0,-2000.,-1500.)' + chr(10)) * 3, 5: 'call CF_Log("Y gold after="+I2S(GetPlayerState(Player(0),PLAYER_STATE_RESOURCE_GOLD)))',
              6: 'call CF_Log("Y gold after2="+I2S(GetPlayerState(Player(0),PLAYER_STATE_RESOURCE_GOLD)))',
              7: ('call CF_SpMake(0,' + q9 + 'cg0c' + q9 + ')' + chr(10) + 'call CF_DbSpawn(0,-1000.,-1500.)' + chr(10) + 'call CF_RepHurt(0)' + chr(10) +
                  'call CF_SpMake(0,' + q9 + 'cg0d' + q9 + ')' + chr(10) + 'call CF_Log("Y rep before="+CF_RepPct(0)+" sp0="+CF_SpCnt(0))'),
              8: 'call CF_DbKill(0,-1000.,-1500.)',
              9: 'call CF_Log("Y ws after kill cgb1="+I2S(CF_DbCnt(0,' + q9 + 'Cgb1' + q9 + '))+" cgb2="+I2S(CF_DbCnt(0,' + q9 + 'Cgb2' + q9 + ')))',
              12: 'call CF_Log("Y rep t1="+CF_RepPct(0))',
              16: 'call CF_Log("Y ws +16s cgb1="+I2S(CF_DbCnt(0,' + q9 + 'Cgb1' + q9 + ')))',
              22: 'call CF_Log("Y ws +28s cgb1="+I2S(CF_DbCnt(0,' + q9 + 'Cgb1' + q9 + ')))' + chr(10) + 'call CF_Log("Y rep t2="+CF_RepPct(0))',
              24: 'call CF_Log("FINISH")'}
        steps = [_y.get(i, 'call DoNothing()') for i in range(25)]
    elif VER.startswith('testx'):
        # настоящая стройка особых зданий игроком 0: даём ресурсы, приказываем строителю, ждём, считаем счётчик и сами здания
        patch('return eA[GetRandomInt(0,j-1)]', 'return 10')
        patch('GetRandomInt(0,Yr)', 'GetRandomInt(10,Yr)', 2)   # все игроки берут Сборщиков
        q8 = chr(39)
        cnt3 = lambda a_: 'I2S(CF_TyCnt(0,' + q8 + a_ + q8 + '))'
        _x = {1: 'call SetPlayerState(Player(0),PLAYER_STATE_RESOURCE_GOLD,5000)' + chr(10) + 'call SetPlayerState(Player(0),PLAYER_STATE_RESOURCE_LUMBER,9000)' + chr(10) +
                 'call CF_SpBuild(0,' + q8 + 'cg0b' + q8 + ')',
              12: 'call CF_Log("Y x t=24s utilizers="+' + cnt3('cg0b') + '+" sp0="+CF_SpCnt(0)+" gold="+I2S(GetPlayerState(Player(0),PLAYER_STATE_RESOURCE_GOLD))+" lum="+I2S(GetPlayerState(Player(0),PLAYER_STATE_RESOURCE_LUMBER)))',
              30: 'call CF_Log("Y x t=60s utilizers="+' + cnt3('cg0b') + '+" sp0="+CF_SpCnt(0))',
              45: 'call CF_Log("Y x t=90s utilizers="+' + cnt3('cg0b') + '+" sp0="+CF_SpCnt(0))',
              46: 'call CF_Log("FINISH")'}
        steps = [_x.get(i, 'call DoNothing()') for i in range(47)]
    elif VER.startswith('testv'):
        # измерение настоящего эффекта командиров в бою: боец игрока 6 бьёт 12 с цель с 90000 здоровья, в лог теряемое здоровье цели; доход пишет INC (base и F)
        _v = {0: 'set CF_Cmd[7]=1', 1: 'set CF_FA[6]=0' + chr(10) + 'set CF_FD[6]=0' + chr(10) + 'call CF_VTrial(4)', 8: 'call CF_VEnd(4)', 9: 'call CF_VTrial(3)', 16: 'call CF_VEnd(3)',
              17: 'call CF_VTrial(0)', 24: 'call CF_VEnd(0)', 25: 'call CF_VTrial(4)', 32: 'call CF_VEnd(4)', 33: 'call CF_Log("FINISH")'}
        steps = [_v.get(i, 'call DoNothing()') for i in range(34)]
    elif VER.startswith('tests'):
        # v25 этап 3, Сборщики. tests1: дымовой тест на ~5 минут. Все случайные выборы расы дают Сборщиков, боты строят и спаунят сами;
        # раз в 20 с в лог счётчики строителей, зданий cg01..cg0a и бойцов cg11..cg19 у игроков 0, 6, 7.
        # tests2: магазин рас: создаём магазин, выбираем его и ставим камеру (снимок делает _shot_when_free.ps1 по метке "S2 shop selected").
        q = chr(39)
        cnt = lambda p, a, b: 'I2S(CF_SbCnt(%d,%s%s%s,%s%s%s))' % (p, q, a, q, q, b, q)
        if VER.startswith('tests1') or VER.startswith('tests3') or VER.startswith('tests4') or VER.startswith('tests5') or VER.startswith('tests6') or VER.startswith('tests7') or VER.startswith('tests8') or VER.startswith('tests9'):   # tests3 = то же без принудительного выбора расы 10, tests4 = пустые шаги (бисекция вылета при загрузке)
            if VER.startswith('tests8'):   # матч бот на бот: игрок 6 = Сборщики (10), игрок 7 = раса из имени версии (tests8r<номер>_N)
                xr = int(re.search(r'tests8r(\d+)', VER).group(1))
                patch('set ui[(1+GetPlayerId(GetEnumPlayer()))]=GetRandomInt(0,Yr)', 'set ui[(1+GetPlayerId(GetEnumPlayer()))]=IntegerTertiaryOp(GetPlayerId(GetEnumPlayer())==6,10,%d)' % xr)
                patch('set ui[i]=GetRandomInt(0,Yr)', 'set ui[i]=IntegerTertiaryOp(i==7,10,%d)' % xr)
            if VER.startswith('tests1') or VER.startswith('tests6') or VER.startswith('tests7') or VER.startswith('tests9'):
                patch('return eA[GetRandomInt(0,j-1)]', 'return 10')
                patch('GetRandomInt(0,Yr)', 'GetRandomInt(10,Yr)', 2)
            steps = ['set CF_BT=650.\ncall SetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD,3000)\ncall SetPlayerState(Player(7),PLAYER_STATE_RESOURCE_GOLD,3000)',
                     'call CF_Log("S race r6="+I2S(CF_BotR[6])+" r7="+I2S(CF_BotR[7])+" b6="+I2S(GetUnitTypeId(CF_BotB[6]))+" b7="+I2S(GetUnitTypeId(CF_BotB[7]))+" ui="+I2S(ui[7])+"/"+I2S(ui[8]))']
            for k in range(2, 450 if VER.startswith('tests7') else 160):   # tests7 = 15 минут зеркало Сборщики против Сборщиков (устойчивость)
                if k % (20 if VER.startswith('tests7') else 10) == 0:
                    parts = '+'.join('" p%d: b="+%s+" bld="+%s+" fgt="+%s' % (p, cnt(p, 'cg00', 'cg00'), cnt(p, 'cg01', 'cg0d'), cnt(p, 'cg11', 'cg19')) for p in (0, 6, 7))
                    steps.append('call CF_Log("S k=%d"+%s+" gold6="+I2S(GetPlayerState(Player(6),PLAYER_STATE_RESOURCE_GOLD))+" uc6="+I2S(CF_UC[6])+" uc7="+I2S(CF_UC[7])+" spg6="+I2S(CF_SpG[6])+" spg7="+I2S(CF_SpG[7])+" inc6="+I2S(CF_IncSum[6])+" inc7="+I2S(CF_IncSum[7])+" c6="+R2S(GetUnitLifePercent(CF_Castle(Fi[7])))+" c7="+R2S(GetUnitLifePercent(CF_Castle(Fi[8]))))' % (k, parts))
                else:
                    steps.append('call DoNothing()')
            ids = ['cg0%d' % d for d in range(1, 10)] + ['cg0a'] + ['cg1%d' % d for d in range(1, 10)]
            for p in (6, 7):
                steps.append('call CF_Log("S types p%d "+%s)' % (p, '+'.join('"%s="+%s+" "' % (i, cnt(p, i, i)) for i in ids)))
            steps.append('call CF_Log("FINISH")')
            if VER.startswith('tests4'):
                steps = ['call DoNothing()'] * 3 + ['call CF_Log("FINISH")']
            if VER.startswith('tests9'):   # зеркало Сборщиков, у каждого бота 2 Утилизатора: сколько золота они дают за матч против обычного дохода
                _q = chr(39)
                steps[0] = steps[0] + chr(10) + ('call CF_SpMake(6,' + _q + 'cg0b' + _q + ')' + chr(10)) * 2 + ('call CF_SpMake(7,' + _q + 'cg0b' + _q + ')' + chr(10)) * 2
            if VER.startswith('tests5'):   # те же шаги, но обрезаны до 25 + FINISH (бисекция: размер функции теста)
                steps = steps[:25] + ['call CF_Log("FINISH")']
            if VER.startswith('tests6'):   # обломки и Великая сборка (v25 этап 4): убиваем бойца игрока 6, считаем Cgb1/Cgb2, ждём 15+ с
                q6 = chr(39)
                cb1, cb2 = q6 + 'Cgb1' + q6, q6 + 'Cgb2' + q6
                lg = lambda tag: 'call CF_Log("%s cgb1="+I2S(CF_DbCnt(6,%s))+" cgb2="+I2S(CF_DbCnt(6,%s))+" fgt="+I2S(CF_SbCnt(6,%scg11%s,%scg19%s)))' % (tag, cb1, cb2, q6, q6, q6, q6)
                # свои бойцы создаются прямо на месте (не ждём естественных): 6 Мусорщиков в ряд, убиваем одного, считаем баффы у остальных
                st = {0: steps[0], 1: steps[1], 3: 'call CF_DbSpawn(6,-2000.,-1500.)', 4: 'call CF_DbKill(6,-2000.,-1500.)', 5: lg('D after kill1'), 6: lg('D after kill1 b'),
                      16: lg('D 20s later'), 18: 'call CF_DbSpawn(6,-1000.,-1500.)',
                      19: 'set CF_AsmE[6]=CF_T+12.' + chr(10) + 'call CF_DbKill(6,-1000.,-1500.)', 20: lg('D after kill2 (assemble)'), 21: lg('D after kill2 b'),
                      31: lg('D 20s later 2'), 33: 'call CF_Log("FINISH")'}
                steps = [st.get(i, 'call DoNothing()') for i in range(34)]
        else:
            steps = ['call DoNothing()'] * 3 + [
                'call zI(Player(0),' + q + 'h033' + q + ')\nif GetLocalPlayer()==Player(0) then\ncall ClearSelection()\ncall SelectUnit(bj_lastCreatedUnit,true)\n'
                'call PanCameraToTimed(GetUnitX(bj_lastCreatedUnit),GetUnitY(bj_lastCreatedUnit),0.)\nendif\n'
                'call CF_Log("S2 shop selected name="+GetUnitName(bj_lastCreatedUnit)+" Yr="+I2S(Yr)+" ti10="+I2S(ti[10])+" team0="+I2S(Fi[1])+" ci="+'
                + '+'.join('I2S(IntegerTertiaryOp(ci[Fi[1]*25+%d],1,0))' % _i for _i in range(11))
                + '+" ui="+' + '+" "+'.join('I2S(ui[%d])' % _i for _i in range(1, 13)) + ')'] + ['call DoNothing()'] * 8 + ['call CF_Log("FINISH")']
        SBF = '''function CF_SbCnt takes integer cf_p,integer cf_a,integer cf_b returns integer
local group cf_g=CreateGroup()
local unit cf_u
local integer cf_n=0
local integer cf_i
call GroupEnumUnitsOfPlayer(cf_g,Player(cf_p),null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null
call GroupRemoveUnit(cf_g,cf_u)
set cf_i=GetUnitTypeId(cf_u)
if cf_i>=cf_a and cf_i<=cf_b and GetWidgetLife(cf_u)>.405 then
set cf_n=cf_n+1
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
return cf_n
endfunction
'''
    elif VER.startswith('testc'):
        # измерение: крит Юры (25% x2) и уклонение Леши (20%) в бою; по 20 шагов (40 с) на пробу, в логе M att/dmg/min/big
        steps = ['call CF_MTrial(5)'] + ['call CF_MOrder()'] * 19 + ['call CF_MEnd()\ncall CF_MTrial(6)'] + ['call CF_MOrder()'] * 19 + ['call CF_MEnd()', 'call CF_Log("FINISH")']
    elif VER.startswith('testz1'):
        # v29: крит Мортиры. Контроль: Камнемёт (cg18) без умения, затем Мортира (cg1a); по 14 шагов (около 28 с) на пробу, в логе M att/dmg/min/big (big = удары от 1.8 минимального = криты)
        steps = ["call CF_ZTrial('cg18','cg12',0)"] + ['call CF_MOrder()'] * 5 + ['call CF_ZDiag()\ncall CF_MOrder()'] + ['call CF_MOrder()'] * 7 + ["call CF_ZDiag()\ncall CF_MEnd()\ncall CF_ZTrial('cg1a','cg12',0)"] + ['call CF_MOrder()'] * 5 + ['call CF_ZDiag()\ncall CF_MOrder()'] + ['call CF_MOrder()'] * 7 + ['call CF_ZDiag()\ncall CF_MEnd()', 'call CF_Log("FINISH")']
    elif VER.startswith('testz2'):
        # v29: уклонение Штурмовика. Контроль: Планер (cg19) без умения, затем Штурмовик (cg1b); бьют 6 Наводчиков (cg16, по воздуху); промахи = att - dmg
        steps = ["call CF_ZTrial('cg16','cg19',1)"] + ['call CF_MOrder()'] * 5 + ['call CF_ZDiag()\ncall CF_MOrder()'] + ['call CF_MOrder()'] * 7 + ["call CF_ZDiag()\ncall CF_MEnd()\ncall CF_ZTrial('cg16','cg1b',1)"] + ['call CF_MOrder()'] * 5 + ['call CF_ZDiag()\ncall CF_MOrder()'] + ['call CF_MOrder()'] * 7 + ['call CF_ZDiag()\ncall CF_MEnd()', 'call CF_Log("FINISH")']
    elif VER.startswith('testz3'):
        # v29: наложение с командиром Юрой (Cc03 на каждом бойце): Камнемёт + Юра (ожидаем около 25%) и Мортира + Юра (независимо около 36%, максимум 25%)
        steps = ["call CF_ZTrial('cg18','cg12',2)"] + ['call CF_MOrder()'] * 5 + ['call CF_ZDiag()\ncall CF_MOrder()'] + ['call CF_MOrder()'] * 7 + ["call CF_ZDiag()\ncall CF_MEnd()\ncall CF_ZTrial('cg1a','cg12',2)"] + ['call CF_MOrder()'] * 5 + ['call CF_ZDiag()\ncall CF_MOrder()'] + ['call CF_MOrder()'] * 7 + ['call CF_ZDiag()\ncall CF_MEnd()', 'call CF_Log("FINISH")']
    elif VER.startswith('testz4'):
        # v29: наложение с командиром Лешей (Cc02 на цели): Планер + Леша (около 20%) и Штурмовик + Леша (независимо около 32%, максимум 20%)
        steps = ["call CF_ZTrial('cg16','cg19',3)"] + ['call CF_MOrder()'] * 5 + ['call CF_ZDiag()\ncall CF_MOrder()'] + ['call CF_MOrder()'] * 7 + ["call CF_ZDiag()\ncall CF_MEnd()\ncall CF_ZTrial('cg16','cg1b',3)"] + ['call CF_MOrder()'] * 5 + ['call CF_ZDiag()\ncall CF_MOrder()'] + ['call CF_MOrder()'] * 7 + ['call CF_ZDiag()\ncall CF_MEnd()', 'call CF_Log("FINISH")']
    elif VER.startswith('testr'):
        steps = race_test_steps()
    elif VER.startswith('testd'):
        steps = bot_test_steps()
    # пустые шаги (DoNothing) ветками не делаем: функция теста со 160 ветками роняла игру при загрузке (бисекция 2026-11-19, tests1 против tests5)
    body = '\n'.join(f'elseif CF_Step=={i} then\ncall CF_Log("{i} start")\n{s}' for i, s in enumerate(steps) if not (VER.startswith('tests') and s == 'call DoNothing()'))
    TF = '''function CF_Log takes string s returns nothing
call DisplayTimedTextToPlayer(GetLocalPlayer(),0,0,30.,"|cff00FF00TEST "+s+"|r")
call Preload(s+" t="+R2S(CF_T))
call PreloadGenEnd("Logs\\\\cftest.txt")
endfunction
function CF_RClean takes nothing returns nothing
local integer i=0
loop
exitwhen i>6
if CF_RE[i]!=null then
call RemoveUnit(CF_RE[i])
set CF_RE[i]=null
endif
set i=i+1
endloop
if CF_RB!=null then
call RemoveUnit(CF_RB)
set CF_RB=null
endif
if CF_TU!=null then
call RemoveUnit(CF_TU)
set CF_TU=null
endif
endfunction
// измерение крита (командир 5) и уклонения (командир 6): 6 бойцов бьют цель с 90000 здоровья, считаем удары, события урона и крупные удары
function CF_MDmg takes nothing returns nothing
local integer cf_n=LoadInteger(CF_HD,21,1)
call SaveInteger(CF_HD,22,cf_n,R2I(GetEventDamage()))
call SaveInteger(CF_HD,21,1,cf_n+1)
endfunction
function CF_MAtt takes nothing returns nothing
call SaveInteger(CF_HD,21,0,LoadInteger(CF_HD,21,0)+1)
endfunction
function CF_MTrial takes integer cf_c returns nothing
local integer cf_i=0
local trigger cf_t
call FlushChildHashtable(CF_HD,21)
call FlushChildHashtable(CF_HD,22)
set CF_Cmd[6]=cf_c
if cf_c==5 then
set CF_TU2=CreateUnit(Player(12),'cg12',-1930.,-1500.,180.)
else
set CF_TU2=CreateUnit(Player(6),'cg12',-1930.,-1500.,180.)
endif
call SetUnitState(CF_TU2,UNIT_STATE_MAX_LIFE,90000.)
call SetWidgetLife(CF_TU2,90000.)
if cf_c==5 then
call PauseUnit(CF_TU2,true)
else
call SetUnitMoveSpeed(CF_TU2,0.)
call CF_Up(CF_TU2)
endif
loop
exitwhen cf_i>5
if cf_c==5 then
set CF_RE[cf_i]=CreateUnit(Player(6),'cg11',-2000.,-1500.+40.*I2R(cf_i),0.)
call CF_Up(CF_RE[cf_i])
else
set CF_RE[cf_i]=CreateUnit(Player(12),'cg11',-2000.,-1500.+40.*I2R(cf_i),0.)
endif
call IssueTargetOrder(CF_RE[cf_i],"attack",CF_TU2)
set cf_i=cf_i+1
endloop
set cf_t=CreateTrigger()
call TriggerRegisterUnitEvent(cf_t,CF_TU2,EVENT_UNIT_DAMAGED)
call TriggerAddAction(cf_t,function CF_MDmg)
set cf_t=CreateTrigger()
call TriggerRegisterUnitEvent(cf_t,CF_TU2,EVENT_UNIT_ATTACKED)
call TriggerAddAction(cf_t,function CF_MAtt)
set cf_t=null
call CF_Log("M start c="+I2S(cf_c)+" ev="+I2S(GetUnitAbilityLevel(CF_TU2,'Cc02'))+" cr="+I2S(GetUnitAbilityLevel(CF_RE[0],'Cc03'))+" enemy="+I2S(IntegerTertiaryOp(IsUnitEnemy(CF_TU2,Player(6)),1,0)))
endfunction
function CF_MOrder takes nothing returns nothing
local integer cf_i=0
loop
exitwhen cf_i>5
if CF_RE[cf_i]!=null and GetWidgetLife(CF_RE[cf_i])>.405 then
call IssueTargetOrder(CF_RE[cf_i],"attack",CF_TU2)
endif
set cf_i=cf_i+1
endloop
endfunction
function CF_MEnd takes nothing returns nothing
local integer cf_n=LoadInteger(CF_HD,21,1)
local integer cf_i=0
local integer cf_mn=999999
local integer cf_c=0
local integer cf_d
loop
exitwhen cf_i>=cf_n
set cf_d=LoadInteger(CF_HD,22,cf_i)
if cf_d>0 and cf_d<cf_mn then
set cf_mn=cf_d
endif
set cf_i=cf_i+1
endloop
set cf_i=0
loop
exitwhen cf_i>=cf_n
if LoadInteger(CF_HD,22,cf_i)*10>=cf_mn*18 then
set cf_c=cf_c+1
endif
set cf_i=cf_i+1
endloop
call CF_Log("M att="+I2S(LoadInteger(CF_HD,21,0))+" dmg="+I2S(cf_n)+" min="+I2S(cf_mn)+" big="+I2S(cf_c))
set cf_i=0
loop
exitwhen cf_i>5
if CF_RE[cf_i]!=null then
call RemoveUnit(CF_RE[cf_i])
set CF_RE[cf_i]=null
endif
set cf_i=cf_i+1
endloop
call RemoveUnit(CF_TU2)
set CF_TU2=null
endfunction
// v29: замер умений улучшений Сборщиков. cf_a = тип бойцов игрока 6 (6 штук), cf_b = тип цели (нейтрал, 90000 здоровья), cf_m: 0 цель на паузе (крит), 1 цель без атаки и без паузы (уклонение)
function CF_ZDiag takes nothing returns nothing
local integer cf_i=0
local integer cf_n=0
loop
exitwhen cf_i>5
if CF_RE[cf_i]!=null and GetWidgetLife(CF_RE[cf_i])>.405 then
set cf_n=cf_n+1
endif
set cf_i=cf_i+1
endloop
if CF_RE[0]!=null and CF_TU2!=null then
call CF_Log("Z diag alive="+I2S(cf_n)+" order="+I2S(GetUnitCurrentOrder(CF_RE[0]))+" dx="+R2S(GetUnitX(CF_TU2)-GetUnitX(CF_RE[0]))+" dy="+R2S(GetUnitY(CF_TU2)-GetUnitY(CF_RE[0]))+" tgt_life="+I2S(R2I(GetWidgetLife(CF_TU2)))+" att="+I2S(LoadInteger(CF_HD,21,0))+" dmg="+I2S(LoadInteger(CF_HD,21,1))+" owner0="+I2S(GetPlayerId(GetOwningPlayer(CF_RE[0]))))
endif
endfunction
function CF_ZTrial takes integer cf_a,integer cf_b,integer cf_m returns nothing
local integer cf_i=0
local integer cf_r=0
local trigger cf_t
call FlushChildHashtable(CF_HD,21)
call FlushChildHashtable(CF_HD,22)
set CF_TU2=CreateUnit(Player(12),cf_b,-1930.,-1500.,180.)
call SetUnitState(CF_TU2,UNIT_STATE_MAX_LIFE,90000.)
call SetWidgetLife(CF_TU2,90000.)
if cf_m==0 or cf_m==2 then
call PauseUnit(CF_TU2,true)
else
call SetUnitMoveSpeed(CF_TU2,0.)
call UnitRemoveAbility(CF_TU2,'Aatk')
endif
if cf_m==3 then
call UnitAddAbility(CF_TU2,'Cc02')
endif
loop
exitwhen cf_i>5
set CF_RE[cf_i]=CreateUnit(Player(6),cf_a,-2000.,-1500.+40.*I2R(cf_i),0.)
if cf_m==2 then
call UnitAddAbility(CF_RE[cf_i],'Cc03')
endif
if IssueTargetOrder(CF_RE[cf_i],"attack",CF_TU2) then
set cf_r=cf_r+1
endif
set cf_i=cf_i+1
endloop
set cf_t=CreateTrigger()
call TriggerRegisterUnitEvent(cf_t,CF_TU2,EVENT_UNIT_DAMAGED)
call TriggerAddAction(cf_t,function CF_MDmg)
set cf_t=CreateTrigger()
call TriggerRegisterUnitEvent(cf_t,CF_TU2,EVENT_UNIT_ATTACKED)
call TriggerAddAction(cf_t,function CF_MAtt)
set cf_t=null
call CF_Log("Z start orders_ok="+I2S(cf_r)+" att_type="+I2S(cf_a)+" hp="+I2S(R2I(GetUnitState(CF_RE[0],UNIT_STATE_MAX_LIFE)))+" tgt_hp="+I2S(R2I(GetUnitState(CF_TU2,UNIT_STATE_LIFE)))+" crit_ab="+I2S(GetUnitAbilityLevel(CF_RE[0],'Cgc1'))+" evade_ab="+I2S(GetUnitAbilityLevel(CF_TU2,'Cgc2'))+" enemy="+I2S(IntegerTertiaryOp(IsUnitEnemy(CF_TU2,Player(6)),1,0))+" tgt_atk="+I2S(GetUnitAbilityLevel(CF_TU2,'Aatk')))
endfunction
function CF_TestTick takes nothing returns nothing
if false then
''' + body + '''
else
call CF_Log("idle "+I2S(CF_Step))
endif
set CF_Step=CF_Step+1
endfunction
function CF_ArtShot takes nothing returns nothing
if GetAttacker()==CF_RB and CF_RB!=null then
set CF_AA=CF_AA+1
endif
endfunction
function CF_ArtHit takes nothing returns nothing
if GetEventDamageSource()==CF_RB and CF_RB!=null then
set CF_AH=CF_AH+1
endif
endfunction
function CF_TestStart takes nothing returns nothing
local trigger t=CreateTrigger()
call TriggerRegisterPlayerUnitEvent(t,Player(6),EVENT_PLAYER_UNIT_ATTACKED,null)
call TriggerAddAction(t,function CF_ArtShot)
set CF_HT=CreateTrigger()
call TriggerAddAction(CF_HT,function CF_ArtHit)
set t=null
call CF_Log("mode")
call PreloadGenClear()
call fd("-r -east2 -skip")
endfunction
'''
    CF_FUNCS = CF_FUNCS.replace('function CF_Castle takes', TF.split('function CF_TestTick')[0] + SBF + RSJ.TEST_FUNCS + 'function CF_Castle takes')
    CF_FUNCS = CF_FUNCS.replace('function CF_Init takes', 'function CF_TestTick' + TF.split('function CF_TestTick', 1)[1] + 'function CF_Init takes')
    _sp = 'local integer p=GetPlayerId(GetOwningPlayer(c))\nif p>11 then'
    assert _sp in CF_FUNCS
    CF_FUNCS = CF_FUNCS.replace(_sp, 'local integer p=GetPlayerId(GetOwningPlayer(c))\n'
                                'call CF_Log("SPELL "+I2S(id-' + chr(39) + 'Cr00' + chr(39) + ')+" p="+I2S(p)+" x="+R2S(GetSpellTargetX())+" y="+R2S(GetSpellTargetY()))\nif p>11 then', 1)
    _anchor = '''call TriggerAddAction(t,function CF_Recount)
set t=null
endfunction'''
    assert _anchor in CF_FUNCS, 'test anchor not found'
    CF_FUNCS = CF_FUNCS.replace(_anchor, '''call TriggerAddAction(t,function CF_Recount)
set t=CreateTrigger()
call TriggerRegisterTimerEventSingle(t,3.)
call TriggerAddAction(t,function CF_TestStart)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,2.)
call TriggerAddAction(t,function CF_TestTick)
set t=null
endfunction''')
    # CF_Step стартует с -15: первые 60 с только пишем «idle»
    j = j.replace('integer CF_Gold=0\n', 'integer CF_Gold=0\ninteger array CF_SpG\ninteger array CF_IncSum\ninteger CF_Step=-6\nunit CF_TU=null\nunit CF_TU2=null\nunit CF_TU3=null\nunit CF_TU4=null\nunit CF_RB=null\nunit array CF_RE\ninteger CF_AA=0\ninteger CF_AH=0\ntrigger CF_HT=null\n', 1)
    OUTD = r'D:\WarcraftIII 1.26a\Maps\cf_test'
    OUT = os.path.join(OUTD, f'CastleFight_{VER}.w3x')
BOTLOG = ('function CF_BotLog takes string s returns nothing\ncall CF_Log(s)\nendfunction\n' if VER.startswith('test')
          else 'function CF_BotLog takes string s returns nothing\ncall CF_PLog(s)\nendfunction\n')
CF_FUNCS = CF_FUNCS.replace('function CF_GiveGold takes', BOTLOG + re.sub(r'\b(g|u|n|c|h|e|k|ok|rc|b|r)\b', r'cf_\1', BOT.jass(RACES, SKILL, summon_unit, CD)) + 'function CF_GiveGold takes')
CF_FUNCS = CF_FUNCS.replace('set t=CreateTrigger()\ncall TriggerRegisterTimerExpireEvent(t,CF_BossTm)', BOT.INIT + 'set t=CreateTrigger()\ncall TriggerRegisterTimerExpireEvent(t,CF_BossTm)')
j = j.replace('integer CF_Gold=0\n', 'integer CF_Gold=0\n' + BOT.GLOBALS, 1)
j = j.replace('integer CF_Gold=0\n', 'integer CF_Gold=0\n' + RSJ.GLOBALS, 1)
CF_FUNCS = CF_FUNCS.replace('//RSJ_INIT', RSJ.INIT)
patch('function main takes nothing returns nothing\n', CF_FUNCS + 'function main takes nothing returns nothing\n')
mi = j.index('function main takes nothing returns nothing\n')
me = j.index('\nendfunction', mi)
j = j[:me] + '\ncall CF_Init()' + j[me:]

# =====================================================================
# Проверка и запись
# =====================================================================
open(os.path.join(HERE, 'war3map.j'), 'w', encoding='utf-8').write(j)
import tempfile
PJD = tempfile.mkdtemp(prefix='pjass_')
for _f in ('common.j', 'Blizzard.j'):
    shutil.copy(os.path.join(TD, 'gamedata', _f), PJD)
shutil.copy(os.path.join(HERE, 'war3map.j'), PJD)
PJ = os.path.join(PJD, 'pjass.exe')
shutil.copy(os.path.join(TD, 'tools', 'pjass.exe'), PJ)
r = subprocess.run([PJ, 'common.j', 'Blizzard.j', 'war3map.j'], cwd=PJD,
                   capture_output=True, text=True, encoding='utf-8', errors='replace')
print(r.stdout.strip().splitlines()[-1])
if r.returncode != 0:
    sys.exit(r.stdout[-2500:])
# 1.26 молча не грузит карту, если локальная переменная совпадает по имени с глобальным МАССИВОМ
r2 = subprocess.run([PJ, '+shadow', 'common.j', 'Blizzard.j', 'war3map.j'], cwd=PJD,
                    capture_output=True, text=True, encoding='utf-8', errors='replace')
_gl = j[j.index('globals\n'):j.index('endglobals')]
_arr = set(re.findall(r'^\w+ array (\w+)', _gl, re.M))
_sh = sorted({m for m in re.findall(r': (\w+) shadows global variable', r2.stdout) if m in _arr})
# Мои функции (CF_*): ни один параметр или local не должен совпадать с функцией или глобальной переменной карты
_funcs = set(re.findall(r'^function (\w+) takes', j, re.M))
_glob = set(re.findall(r'^\s*(?:constant\s+)?\w+\s+(?:array\s+)?(\w+)\s*(?:=|$)', _gl, re.M))
_mine = set()
for _m in re.finditer(r'^function CF_\w+ takes (.*?) returns', j, re.M):
    _mine |= set(re.findall(r'\w+ (\w+)', _m.group(1))) - {'nothing'}
for _blk in re.findall(r'^function CF_\w+ takes.*?^endfunction', j, re.M | re.S):
    _mine |= set(re.findall(r'^local \w+ (?:array )?(\w+)', _blk, re.M))
_clash = sorted(_mine & (_funcs | _glob))
assert not _clash, f'имена в моём коде совпадают с функциями или глобалами карты: {_clash}'
# каждая своя способность должна стоять на реально существующей в 1.26 основе (AIde, например, нет - вылет)
_slk = mb.open_archive(os.path.join(HERE, 'mpqcopy', 'War3Patch.mpq'))
_ids = set(re.findall(r'C;X1;Y\d+;K"(\w{4})"', mb.read(_slk, 'Units\\AbilityData.slk').decode('latin1')))
mb.dll.SFileCloseArchive(_slk)
_bad = [(o.id, o.base) for o in atabs[1] if o.base not in _ids]
assert not _bad, f'способности на несуществующей основе: {_bad}'
# модель каждого босса должна быть в архивах игры (иначе юнит невидим, баг v11)
_arcs = [mb.open_archive(os.path.join(HERE, 'mpqcopy', _n)) for _n in ('War3Patch.mpq', 'War3x.mpq', 'war3.mpq')]
_nomdl = [bm for _, bm, *_r in BOSSES if not any(mb.read(_a, bm[:-4] + '.mdx') for _a in _arcs)]
# и моделей бойцов и строителя Сборщиков
_race_mdl = [u[12] for u in RS.UNITS] + ([U[RS.BUILDER].get('umdl')] if U[RS.BUILDER].get('umdl') else [])
_nomdl += [bm for bm in _race_mdl if not any(mb.read(_a, bm[:-4] + '.mdx') for _a in _arcs)]
for _a in _arcs:
    mb.dll.SFileCloseArchive(_a)
assert not _nomdl, f'нет моделей боссов: {_nomdl}'
w3u = C.dump(uver, utabs, False)
w3a = C.dump(aver, atabs, True)
w3t = C.dump(tver, ttabs, False)
assert C.dump(*C.parse(w3u, False), False) == w3u and C.dump(*C.parse(w3a, True), True) == w3a and C.dump(*C.parse(w3t, False), False) == w3t
# новые предметы продаются в замке и ссылаются на существующие умения
_ids_t = {o.id: o for o in ttabs[1]}
assert 'I00E' in _ids_t and 'I00F' in _ids_t
_ab_ids = {o.id for o in atabs[1]}
assert {'Ci01', 'Ci02', 'Ci03'} <= _ab_ids, 'нет умений предметов'
assert all(x in U['hcas'].get('umki').split(',') for x in ('I00E', 'I00F'))
# Сборщики: все объекты в таблице, строитель знает свои здания, у каждого здания есть боец, id и pv не повторяются
_ids_u = [o.id for t in utabs for o in t]
assert len(_ids_u) == len(set(_ids_u)), 'повтор id юнитов'
_sb_b = U[RS.BUILDER].get('ubui').split(',')
assert all(b in U for b in _sb_b), _sb_b
assert all(U[b].get('utra') in U for b in _sb_b if b not in ('h008', RS.TOWER[0]) + tuple(x[0] for x in RS.SPECIALS)), 'у здания Сборщиков нет бойца'
assert 'ti[10]' in j and 'set Yr=10' in j and "'cg01'" in j
open(os.path.join(HERE, 'changes.txt'), 'w', encoding='utf-8').write('\n'.join(LOG) + '\n')
os.makedirs(OUTD, exist_ok=True)
if os.path.exists(OUT):
    sys.exit(f'{OUT} уже есть, укажи другую версию')
shutil.copyfile(SRC, OUT)
h = mb.open_archive(OUT)
# Дороги (текстуры Vstp и Zdtr) нельзя застраивать: ставим флаг 0x08 «нельзя строить» в карте проходимости
w3e = mb.read(h, 'war3map.w3e')
wpm = bytearray(mb.read(h, 'war3map.wpm'))
_nt = struct.unpack('<i', w3e[13:17])[0]
_tex = [w3e[17 + 4 * i:21 + 4 * i].decode() for i in range(_nt)]
_p = 17 + 4 * _nt
_p += 4 + 4 * struct.unpack('<i', w3e[_p:_p + 4])[0]
_mx, _my = struct.unpack('<ii', w3e[_p:_p + 8]); _p += 16
_road = {_tex.index(t) for t in ('Vstp', 'Zdtr') if t in _tex}
_W, _H = struct.unpack('<ii', wpm[8:16])
_n = 0
for _j in range(_H):
    for _i in range(_W):
        _v = round((_i * 32 + 16) / 128) + round((_j * 32 + 16) / 128) * _mx
        # площадка замков (±4864, 0) не трогаем: иначе замок не встаёт на своё место и сдвигается в угол
        _cx, _cy = (_i - _W / 2) * 32 + 16, (_j - _H / 2) * 32 + 16
        if abs(abs(_cx) - 4864) < 640 and abs(_cy) < 640:
            continue
        if w3e[_p + 7 * _v + 4] & 15 in _road and not wpm[16 + _i + _j * _W] & 8:
            wpm[16 + _i + _j * _W] |= 8
            _n += 1
print('клеток дорог закрыто для стройки:', _n)
assert _n > 5000
# Текст «нет еды»: в игре это 4 текста через запятую (по одному на расу), в оригинале карты был один -> у части рас «Error message missing»
skin = mb.read(h, 'war3mapSkin.txt').decode('utf-8')
_nf = 'Нужна еда! Легендарное здание занимает 1 еду. Купите Сыр в замке за 1500 золота.'
assert skin.count('Nofood=TRIGSTR_378') == 1
skin = skin.replace('Nofood=TRIGSTR_378', 'Nofood=' + ','.join([_nf] * 4))
mb.write_files(h, {'war3map.j': j.encode('utf-8'), 'war3map.w3u': w3u, 'war3map.w3a': w3a, 'war3map.w3t': w3t, 'war3map.wpm': bytes(wpm), 'war3mapSkin.txt': skin.encode('utf-8')})
mb.dll.SFileCloseArchive(h)
print('правок объектов:', len(LOG))
print('OK', OUT)
