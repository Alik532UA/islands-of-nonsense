# Раса «Сборщики» (11-я, индекс 10): каркас этапа 3 задачи cf-items-race.
# Объекты строятся клонированием готовых аналогов из карты (так у юнитов и зданий есть все поля, которые нужны скрипту),
# затем подменяются цифры по спеке tasks\2026-11-19-cf-items-race\out\race_spec.md.
# Идентификаторы: строитель cg00, здания cg01..cg09 и башня cg0a, бойцы cg11..cg19 (строчная первая буква: не герои).
# Механики этапа 4 (обломки, ауры пар, умение расы) здесь НЕ реализованы: у расы пока заглушка умения kind 'as'.
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
UA_JSON = os.path.join(HERE, 'race_sbor_ua.json')
RACE_INDEX = 10
BUILDER = 'cg00'
NAME = 'Сборщики'
NAME_GEN = 'Сборщиков'
SKILL = ('Великая сборка', 'Велика збірка', 'На 12 с каждый павший боец усиливает не двоих, а четверых ближайших союзников на 15 с, и сильнее: +20% скорости атаки вместо +10%.',
         'На 12 с кожен полеглий боєць підсилює не двох, а чотирьох найближчих союзників на 15 с, і сильніше: +20% швидкості атаки замість +10%.')

UP_CRIT_PCT = 15     # Мортира: шанс критического удара, % (поле Ocr1 в процентах), множитель UP_CRIT_MUL
UP_CRIT_MUL = 2.0
UP_EVADE_PCT = 15    # Штурмовик: шанс уклониться, % (поле Eev1 долями: 0.15)

# тип атаки / тип брони: ключ -> (русское, украинское)
ATK = {'normal': ('Обычная', 'Звичайна'), 'pierce': ('Колющая', 'Колюча'), 'siege': ('Осадная', 'Облогова'), 'chaos': ('Хаос', 'Хаос')}
DEF = {'small': ('Лёгкая', 'Легка'), 'medium': ('Средняя', 'Середня'), 'large': ('Тяжёлая', 'Важка')}

Y = '|cffFFFF00'
L = '|cffFFFF80'
# id, имя ru/ua, аналог для клонирования, здоровье, броня, урон/с, пауза удара, дальность (100 = ближний бой), бег,
# тип атаки, тип брони, модель, масштаб, точка pv, роль ru/ua
UNITS = [
    ('cg11', 'Мусорщик', 'Сміттяр', 'hfoo', 440, 2, 17, 1.4, 100, 260, 'normal', 'medium', r'units\creeps\Bandit\Bandit.mdl', 1.0, 162,
     'Дешёвая масса: держит линию, пока дорогие бойцы стреляют.', 'Дешева маса: тримає лінію, поки дорогі бійці стріляють.'),
    ('cg12', 'Латник', 'Латник', 'h03B', 1050, 6, 24, 1.6, 100, 240, 'normal', 'large', r'units\human\Footman\Footman.mdl', 1.2, 163,
     'Бронированный страж. Парный боец для Дробильщика.', 'Броньований вартовий. Парний боєць для Дробильника.'),
    ('cg13', 'Броненосец', 'Броненосець', 'h03B', 1550, 9, 38, 1.6, 100, 240, 'normal', 'large', r'units\creeps\RockGolem\RockGolem.mdl', 0.85, 164,
     'Улучшенный латник: почти не пробивается обычным оружием.', 'Покращений латник: майже не пробивається звичайною зброєю.'),
    ('cg14', 'Дробильщик', 'Дробильник', 'hfoo', 560, 2, 37, 1.8, 100, 270, 'chaos', 'medium', r'units\creeps\Ogre\Ogre.mdl', 0.9, 165,
     'Громила с уроном хаоса: бьёт любую броню в полную силу.', 'Горила з шкодою хаосу: б\'є будь-яку броню на повну силу.'),
    ('cg15', 'Разрушитель', 'Руйнівник', 'hfoo', 950, 4, 62, 1.8, 100, 270, 'chaos', 'medium', r'units\creeps\OgreLord\OgreLord.mdl', 0.9, 166,
     'Улучшенный дробильщик: тяжёлый урон хаоса.', 'Покращений дробильник: важка шкода хаосу.'),
    ('cg16', 'Наводчик', 'Наводник', 'hrif', 430, 0, 28, 1.5, 550, 270, 'pierce', 'medium', r'units\human\Rifleman\Rifleman.mdl', 1.0, 167,
     'Единственный наземный боец расы, который бьёт по воздуху.', 'Єдиний наземний боєць раси, що б\'є по повітрю.'),
    ('cg17', 'Дальномер', 'Далекомір', 'hrif', 600, 1, 55, 1.5, 650, 270, 'pierce', 'medium', r'units\human\Rifleman\Rifleman.mdl', 1.2, 168,
     'Улучшенный наводчик: дальше бьёт и сильнее.', 'Покращений наводник: б\'є далі та сильніше.'),
    ('cg18', 'Камнемёт', 'Камнемет', 'hmtm', 520, 1, 34, 2.4, 900, 220, 'siege', 'medium', r'units\orc\Catapult\Catapult.mdl', 0.9, 169,
     'Осадное орудие: бьёт издалека по области, медленно ходит.', 'Облогова зброя: б\'є здалеку по області, повільно ходить.'),
    ('cg19', 'Планер', 'Планер', 'h016', 500, 2, 30, 1.4, 400, 300, 'pierce', 'small', r'units\human\Gyrocopter\Gyrocopter.mdl', 0.9, 170,
     'Летающий боец: единственный воздух у Сборщиков.', 'Літаючий боєць: єдине повітря у Збирачів.'),
    # v29: улучшения Камнемёта и Планера. Цифры включают умение: Мортира 48 урона/с + крит 15% x2 даёт около 55, Штурмовик 680 здоровья + уклонение 15% даёт около 780
    ('cg1a', 'Мортира', 'Мортира', 'hmtm', 800, 2, 48, 2.4, 950, 220, 'siege', 'medium', r'units\orc\Catapult\Catapult.mdl', 1.15, 176,
     f'Улучшенный камнемёт: дальше бьёт и крепче. Умение: {UP_CRIT_PCT}% шанс критического удара (двойной урон).',
     f'Покращений камнемет: б\'є далі та міцніший. Вміння: {UP_CRIT_PCT}% шанс критичного удару (подвійна шкода).'),
    ('cg1b', 'Штурмовик', 'Штурмовик', 'h016', 680, 3, 48, 1.4, 450, 300, 'pierce', 'small', r'units\human\Gyrocopter\Gyrocopter.mdl', 1.15, 177,
     f'Улучшенный планер: крепче и бьёт сильнее. Умение: {UP_EVADE_PCT}% шанс уклониться от атаки.',
     f'Покращений планер: міцніший і б\'є сильніше. Вміння: {UP_EVADE_PCT}% шансу ухилитися від атаки.'),
]
# умения новых бойцов (способности Cgc1, Cgc2 создаются в build_cf.py): боец -> id способности
ABIL = {'cg1a': 'Cgc1', 'cg1b': 'Cgc2'}
# здание: id, имя ru/ua, аналог, цена, боец, улучшение до (id) или предыдущее здание, тир (ureq), здоровье, кнопка (x, y), клавиша, pv,
# вид регистрации (Wc обычное, oC осадное), классы для скрипта (атака, броня), приоритет цели
BUILDINGS = [
    ('cg01', 'Свалка', 'Звалище', 'h00S', 150, 'cg11', '', '', 1300, (0, 0), 'Q', 152, 'Wc', ('dC', 'bC'), 2),
    ('cg02', 'Клепальня', 'Клепальня', 'h037', 280, 'cg12', 'cg07', 'tec1', 1300, (1, 0), 'W', 153, 'Wc', ('dC', 'BC'), 2),
    ('cg03', 'Дробильня', 'Дробильня', 'h04S', 240, 'cg14', 'cg08', 'tec1', 1300, (2, 0), 'E', 154, 'Wc', ('gC', 'bC'), 2),
    ('cg04', 'Вышка наводчиков', 'Вежа наводників', 'h02H', 200, 'cg16', 'cg09', '', 1300, (3, 0), 'R', 155, 'Wc', ('DC', 'bC'), 3),
    ('cg05', 'Камнемётня', 'Камнеметня', 'h04Q', 330, 'cg18', 'cg0e', 'tec2', 1400, (0, 1), 'A', 156, 'oC', ('fC', 'bC'), 2),
    ('cg06', 'Ангар', 'Ангар', 'h00K', 300, 'cg19', 'cg0f', 'tec2', 1400, (1, 1), 'S', 157, 'Wc', ('DC', 'NC'), 3),
]
# улучшения: id, имя ru/ua, аналог, доплата, боец, предыдущее здание, тир, здоровье, pv, приоритет
UPGRADES = [
    ('cg07', 'Бронекузня', 'Броньова кузня', 'h039', 250, 'cg13', 'cg02', 'tec2', 1500, 158, ('dC', 'BC'), 2),
    ('cg08', 'Громильня', 'Громильня', 'h039', 260, 'cg15', 'cg03', 'tec2', 1500, 159, ('gC', 'bC'), 2),
    ('cg09', 'Дальнобойная вышка', 'Далекобійна вежа', 'h039', 180, 'cg17', 'cg04', 'tec2', 1400, 160, ('DC', 'bC'), 3),
    # v29: доплата 270 и 260 (после баланса Ангар и его улучшение подорожают на 10% как у всех летающих)
    ('cg0e', 'Мортирня', 'Мортирня', 'h039', 270, 'cg1a', 'cg05', 'tec2', 1500, 174, ('fC', 'bC'), 2),
    ('cg0f', 'Штурмовой ангар', 'Штурмовий ангар', 'h039', 260, 'cg1b', 'cg06', 'tec2', 1500, 175, ('DC', 'NC'), 3),
]
TOWER = ('cg0a', 'Сборочная башня', 'Збиральна вежа', 'h006', 150, 161, (0, 2), 'Y')
# падежи для подсказок: «Построить <вин.>», «Улучшить до <род.>», «Тренерует <вин. одуш.>»
ACC = {'cg01': ('Свалку', 'Звалище'), 'cg02': ('Клепальню', 'Клепальню'), 'cg03': ('Дробильню', 'Дробильню'),
       'cg04': ('Вышку наводчиков', 'Вежу наводників'), 'cg05': ('Камнемётню', 'Камнеметню'), 'cg06': ('Ангар', 'Ангар'),
       'cg0a': ('Сборочную башню', 'Збиральну вежу')}
GEN = {'cg07': ('Бронекузни', 'Броньової кузні'), 'cg08': ('Громильни', 'Громильні'), 'cg09': ('Дальнобойной вышки', 'Далекобійної вежі'),
       'cg0e': ('Мортирни', 'Мортирні'), 'cg0f': ('Штурмового ангара', 'Штурмового ангара')}
UACC = {'cg11': ('Мусорщика', 'Сміттяра'), 'cg12': ('Латника', 'Латника'), 'cg13': ('Броненосца', 'Броненосця'),
        'cg14': ('Дробильщика', 'Дробильника'), 'cg15': ('Разрушителя', 'Руйнівника'), 'cg16': ('Наводчика', 'Наводника'),
        'cg17': ('Дальномера', 'Далекоміра'), 'cg18': ('Камнемёта', 'Камнемета'), 'cg19': ('Планера', 'Планера'),
        'cg1a': ('Мортиру', 'Мортиру'), 'cg1b': ('Штурмовика', 'Штурмовика')}
# Особые здания расы (v26): занимают свободные клетки меню строительства (2,1), (3,1), (1,2). Эффекты считает race_sbor_jass.py.
SP_GOLD = 2        # Утилизатор: золота за каждого павшего бойца Сборщиков
SP_CAP = 2         # сколько зданий одного вида складываются
SP_DB_N = 1        # Сборочный цех: на сколько бойцов больше получают бафф обломков
SP_DB_SEC = 5      # Сборочный цех: на сколько секунд дольше бафф
SP_REP_PCT = 3     # Ремонтный пункт: процент здоровья замка за такт
SP_REP_SEC = 20    # Ремонтный пункт: период, с
# id, имя ru/ua, аналог для клона, золото, дерево, здоровье, клетка, клавиша, pv, коэффициент дохода для скрипта (rr/oa), приоритет бота, вин. падеж ru/ua, описание ru/ua
SPECIALS = [
    ('cg0b', 'Утилизатор', 'Утилізатор', 'h01P', 220, 420, 900, (2, 1), 'D', 171, 'rr', 420, 'Утилизатор', 'Утилізатор',
     f'Каждый павший боец Сборщиков приносит {SP_GOLD} золота (складываются до {SP_CAP} зданий). Окупается в затяжной свалке, в тихой партии почти не даёт дохода.',
     f'Кожен полеглий боєць Збирачів приносить {SP_GOLD} золота (складаються до {SP_CAP} будівель). Окуповується в затяжній звалці, у тихій партії майже не дає доходу.'),
    ('cg0c', 'Сборочный цех', 'Збиральний цех', 'h08P', 300, 600, 1000, (3, 1), 'F', 172, 'oa', 600, 'Сборочный цех', 'Збиральний цех',
     f'Пока стоит, обломки усиливают на {SP_DB_N} бойца больше и держатся на {SP_DB_SEC} с дольше. Несколько цехов не складываются.',
     f'Поки стоїть, уламки підсилюють на {SP_DB_N} бійця більше і тримаються на {SP_DB_SEC} с довше. Кілька цехів не складаються.'),
    ('cg0d', 'Ремонтный пункт', 'Ремонтний пункт', 'h02R', 350, 700, 1000, (1, 2), 'X', 173, 'rr', 750, 'Ремонтный пункт', 'Ремонтний пункт',
     f'Каждые {SP_REP_SEC} с чинит замок команды на {SP_REP_PCT}% здоровья (складываются до {SP_CAP} пунктов). Единственное лечение расы, лечит только замок.',
     f'Кожні {SP_REP_SEC} с лагодить замок команди на {SP_REP_PCT}% здоров\'я (складаються до {SP_CAP} пунктів). Єдине лікування раси, лікує лише замок.'),
]
SHOP_POS = (2, 2)
BUILDER_PV = RACE_INDEX


def _set(o, fid, val):
    """Поле объекта: тип берём из существующего, для новых полей по таблице."""
    if val is None:
        o.mods[:] = [m for m in o.mods if m[0] != fid]
        return
    typ = {'ua1c': 2, 'uacq': 2, 'usca': 1}.get(fid)
    o.set(fid, val, typ if typ is not None else (3 if isinstance(val, str) else 0))


def _clone(U, analog, new, C):
    a = U[analog]
    return C.Obj(a.base, new, [m[:5] for m in a.mods])


def add_objects(U, utabs, C, icon):
    """Создаёт строителя, бойцов, здания и башню в таблице пользовательских юнитов (utabs[1]). Ничего не удаляет."""
    clash = [k for k in U if k[:2] == 'cg']
    assert not clash, f'ID cg* заняты: {clash}'
    used_pv = {o.get('upoi') for o in U.values() if o.get('upoi') is not None}
    new = []
    # строитель: клон строителя Людей, свои имя, модель, список зданий и место кнопки в магазине рас
    b = _clone(U, 'h00C', BUILDER, C)
    bis = os.environ.get('CF_SB_V', '')   # только для поиска причины (деление): C = без art, F = без своих текстов
    _set(b, 'ubui', ','.join([x[0] for x in BUILDINGS] + ['h008', TOWER[0]]))
    _set(b, 'upoi', BUILDER_PV)
    _set(b, 'ubpx', SHOP_POS[0])
    _set(b, 'ubpy', SHOP_POS[1])
    if bis not in ('C', 'F'):
        _set(b, 'umdl', r'units\creeps\Gnoll\Gnoll.mdl')
        _set(b, 'usca', 0.9)
        _set(b, 'uico', icon('Gnoll', 'Peon', 'Peasant'))
    new.append(b)
    for (uid, ru, ua, an, hp, arm, dps, cd, rng, spd, atk, dfn, mdl, sc, pv, role_ru, role_ua) in UNITS:
        o = _clone(U, an, uid, C)
        avg = max(1, int(round(dps * cd)))
        for f, v in (('uhpm', hp), ('udef', arm), ('ua1b', avg - 2), ('ua1d', 1), ('ua1s', 3), ('ua1c', float(cd)), ('ua1r', rng),
                     ('uacq', float(max(800, rng + 150))), ('umvs', spd), ('ua1t', atk), ('udty', dfn), ('umdl', mdl), ('usca', sc),
                     ('upoi', pv), ('utyp', 'sapper,ward'), ('uabi', ABIL.get(uid, '')), ('udaa', None), ('unam', ru)):
            _set(o, f, v)
        if uid in ('cg19', 'cg1b'):   # летающий: стрелять по земле и воздуху
            _set(o, 'ua1g', 'air,debris,ground,item,structure,ward')
            _set(o, 'uaen', 1)
        new.append(o)
    for (bid, ru, ua, an, gold, unit, upg, req, hp, pos, hot, pv, reg, cls, pri) in BUILDINGS:
        o = _clone(U, an, bid, C)
        for f, v in (('ugol', gold), ('utra', unit), ('uupt', upg), ('ureq', req), ('urqa', '1' if req else None), ('uhpm', hp), ('upoi', pv),
                     ('uabi', ''), ('ubpx', pos[0]), ('ubpy', pos[1]), ('uhot', hot), ('unam', ru)):
            _set(o, f, v)
        new.append(o)
    for (bid, ru, ua, an, gold, unit, prev, req, hp, pv, cls, pri) in UPGRADES:
        o = _clone(U, an, bid, C)
        for f, v in (('ugol', gold), ('utra', unit), ('uupt', None), ('ureq', req), ('urqa', '1'), ('uhpm', hp), ('upoi', pv),
                     ('uabi', ''), ('uhot', 'T'), ('unam', ru)):
            _set(o, f, v)
        new.append(o)
    tid, ru, ua, an, gold, pv, pos, hot = TOWER
    t = _clone(U, an, tid, C)
    for f, v in (('upoi', pv), ('ubpx', pos[0]), ('ubpy', pos[1]), ('uhot', hot), ('unam', ru)):
        _set(t, f, v)
    new.append(t)
    # pv строителя = индекс расы (у оригинальных строителей он тоже пересекается с pv зданий), его не проверяем
    for (sid, ru, ua, an, gold, lum, hp, pos, hot, pv, rate, pri, acc_ru, acc_ua, d_ru, d_ua) in SPECIALS:
        o = _clone(U, an, sid, C)
        for f, v in (('ugol', gold), ('ulum', lum), ('uhpm', hp), ('upoi', pv), ('uabi', ''), ('ubpx', pos[0]), ('ubpy', pos[1]),
                     ('uhot', hot), ('unam', ru), ('ureq', ''), ('urqa', None), ('utra', ''), ('uupt', '')):
            _set(o, f, v)
        new.append(o)
    _set(b, 'ubui', ','.join([x[0] for x in BUILDINGS] + ['h008', TOWER[0]] + [x[0] for x in SPECIALS]))
    pvs = [o.get('upoi') for o in new if o.id != BUILDER]
    assert len(set(pvs)) == len(pvs) and not (set(pvs) & used_pv), ('pv не уникальны', pvs)
    for o in new:
        U[o.id] = o
        utabs[1].append(o)
    return new


def script_patches():
    """Пары (старое, новое) для war3map.j: регистрация зданий, строитель в магазине рас, число рас 11."""
    reg = ['set vC=10']
    for (bid, ru, ua, an, gold, unit, upg, req, hp, pos, hot, pv, kind, cls, pri) in BUILDINGS:
        reg.append(f"call {kind}('{bid}',{gold},'{unit}',{cls[0]},{cls[1]},vC,{pri})")
        for (uid, uru, uua, uan, ugold, uunit, prev, ureq, uhp, upv, ucls, upri) in UPGRADES:
            if prev == bid:
                ek = 'RC' if kind == 'oC' else 'EC'   # RC = улучшение осадного здания (в оригинале так сделано у h04Q -> h04P)
                reg.append(f"call {ek}('{uid}',{ugold},'{uunit}',{gold},'{bid}',{ucls[0]},{ucls[1]},vC,{upri})")
    reg.append(f"call VC('{TOWER[0]}',{TOWER[4]},vC,300)")
    for (sid, ru, ua, an, gold, lum, hp, pos, hot, pv, rate, pri, acc_ru, acc_ua, d_ru, d_ua) in SPECIALS:
        reg.append(f"call rC('{sid}',{gold},{rate},GC,vC,{pri})")
    anchor = "call IC('h05R',140,oa,190,'h06J',vC,130)\nset ei[14]=180\n"
    return [
        (anchor, anchor.split('\n')[0] + '\n' + '\n'.join(reg) + '\nset ei[14]=180\n'),
        ('set Yr=9\n', f'set Yr={RACE_INDEX}\n'),
        ("set ti[9]='h06P'\nset Go[9]=\"Техников\"\n",
         f"set ti[9]='h06P'\nset Go[9]=\"Техников\"\nset ti[{RACE_INDEX}]='{BUILDER}'\nset Go[{RACE_INDEX}]=\"{NAME_GEN}\"\n"),
    ]


def _stat_block(o, hp, arm, ua1b, cd, rng, atk, dfn, ua=False):
    i = 1 if ua else 0
    dps = (ua1b + 2) / cd
    rtxt = ('ближний бой', 'ближній бій')[i] if rng <= 150 else f'{Y}{rng}|r ' + ('дальность', 'дальність')[i]
    if rng <= 150:
        rtxt = f'{Y}{rtxt}|r'
    lab = (('Атака', 'Броня', 'Жизни', 'урона/с'), ('Атака', 'Броня', 'Життя', 'шкоди/с'))[i]
    return (f'|n{L}{lab[0]}:|r {ATK[atk][i]} ({rtxt},{Y} {dps:.0f}|r {lab[3]})|n{L}{lab[1]}:|r {DEF[dfn][i]} ({Y}{arm}|r)'
            f'|n{L}{lab[2]}: {Y}{hp}|r')


def finalize_text(U, C):
    """Тексты объектов после баланса: цифры берём из итоговых полей. Пишет таблицу перевода ru -> ua в race_sbor_ua.json."""
    tr = {}
    udata = {}

    def T(ru, ua):
        tr[ru] = ua
        return ru

    for (uid, ru, ua, an, hp, arm, dps, cd, rng, spd, atk, dfn, mdl, sc, pv, role_ru, role_ua) in UNITS:
        o = U[uid]
        fhp, farm, fb, fc = o.get('uhpm'), o.get('udef'), o.get('ua1b'), o.get('ua1c')
        blocks = []
        for ui in (0, 1):
            blk = _stat_block(o, fhp, farm, fb, fc, rng, atk, dfn, ua=bool(ui)) + f'|n|n{(role_ru, role_ua)[ui]}'
            blocks.append(blk)
        T(blocks[0], blocks[1])
        _set(o, 'unam', T(ru, ua))
        _set(o, 'utip', T(f'Тренерует {UACC[uid][0]}', f'Тренує {UACC[uid][1]}'))
        _set(o, 'utub', blocks[0])
        udata[uid] = (ru, ua, blocks)
    for (bid, ru, ua, an, gold, unit, upg, req, hp, pos, hot, pv, kind, cls, pri) in BUILDINGS:
        o = U[bid]
        uru, uua, blks = udata[unit][0], udata[unit][1], udata[unit][2]
        up = [x for x in UPGRADES if x[6] == bid]
        head_ru = f'{L}Тренерует: {Y}{uru}|n{L}Улучшения: {Y}{len(up)}|n|n{L}{uru}:|r'
        head_ua = f'{L}Тренує: {Y}{uua}|n{L}Покращення: {Y}{len(up)}|n|n{L}{uua}:|r'
        _set(o, 'unam', T(ru, ua))
        _set(o, 'utip', T(f'Построить {ACC[bid][0]} [|cffffcc00{hot}|r]', f'Збудувати {ACC[bid][1]} [|cffffcc00{hot}|r]'))
        _set(o, 'utub', T(head_ru + blks[0], head_ua + blks[1]))
    for (bid, ru, ua, an, gold, unit, prev, req, hp, pv, cls, pri) in UPGRADES:
        o = U[bid]
        uru, uua, blks = udata[unit][0], udata[unit][1], udata[unit][2]
        _set(o, 'unam', T(ru, ua))
        _set(o, 'utip', T(f'Улучшить до {GEN[bid][0]} [|cffffcc00T|r]', f'Покращити до {GEN[bid][1]} [|cffffcc00T|r]'))
        _set(o, 'utub', T(f'{L}Тренерует: {Y}{uru}|n|n{L}{uru}:|r' + blks[0], f'{L}Тренує: {Y}{uua}|n|n{L}{uua}:|r' + blks[1]))
    tid, ru, ua, an, gold, pv, pos, hot = TOWER
    o = U[tid]
    _set(o, 'unam', T(ru, ua))
    _set(o, 'utip', T(f'Построить {ACC[tid][0]} [|cffffcc00{hot}|r]', f'Збудувати {ACC[tid][1]} [|cffffcc00{hot}|r]'))
    _set(o, 'utub', T('|cffFFAC00Защита базы|r:|nУсиленная башня Сборщиков: бьёт издалека по всем целям.|n|n' + L + 'Атака:' + Y + ' Колющая|n' + L + 'Дистанция:' + Y + ' 950|r',
                      '|cffFFAC00Захист бази|r:|nПосилена вежа Збирачів: б\'є здалеку по всіх цілях.|n|n' + L + 'Атака:' + Y + ' Колюча|n' + L + 'Дистанція:' + Y + ' 950|r'))
    for (sid, ru, ua, an, gold, lum, hp, pos, hot, pv, rate, pri, acc_ru, acc_ua, d_ru, d_ua) in SPECIALS:
        o = U[sid]
        _set(o, 'unam', T(ru, ua))
        _set(o, 'utip', T(f'Построить {acc_ru} [|cffffcc00{hot}|r]', f'Збудувати {acc_ua} [|cffffcc00{hot}|r]'))
        _set(o, 'utub', T('|cffFFAC00Особое здание|r:|n' + d_ru, '|cffFFAC00Особлива будівля|r:|n' + d_ua))
    b = U[BUILDER]
    if os.environ.get('CF_SB_V') == 'F':
        return tr
    _set(b, 'unam', T('Сборщик', 'Збирач'))
    _set(b, 'utip', T('|cffFFD900Выбрать Сборщиков|r', '|cffFFD900Обрати Збирачів|r'))
    _set(b, 'utub', T('Дешёвая медленная бронированная пехота без лечения и воскрешения. Сильна в затяжных массовых боях, слаба против быстрых одиночек и дальнего боя. Парные здания усиливают друг друга.',
                      'Дешева повільна броньована піхота без лікування та воскресіння. Сильна в затяжних масових боях, слабка проти швидких одинаків і дальнього бою. Парні будівлі підсилюють одна одну.'))
    tr[NAME_GEN] = 'Збирачів'
    tr[SKILL[0]] = SKILL[1]
    tr[SKILL[2] + ' Перезарядка 150 с.'] = SKILL[3] + ' Перезарядка 150 с.'
    tr[SKILL[2]] = SKILL[3]
    json.dump(tr, open(UA_JSON, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    return tr
