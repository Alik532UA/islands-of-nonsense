# Сборщик карты Кооп TD для WC3 1.26a.
# 1) генерирует war3map.w3u (строители, башни, крипы волн)
# 2) генерирует TD_InitData и вклеивает td_globals.j / td_funcs.j в war3map.j шаблона
# 3) проверяет JASS (все вызываемые функции существуют и объявлены раньше)
# 4) пакует новую карту (MPQ) из шаблона, файлы шаблона копируются как есть
# Запуск: python -X utf8 gen.py <шаблон.w3x> <выход.w3x>
import os, re, shutil, struct, sys, math
import mpyq
import bosses as BS

HERE = os.path.dirname(os.path.abspath(__file__))
GD = os.path.join(HERE, "gamedata")

# ---------- данные игры ----------
def parse_slk(path):
    cells, cy = {}, 0
    for l in open(path, encoding="latin1").read().splitlines():
        if not l.startswith("C;"):
            continue
        x = y = k = None
        for q in l.split(";")[1:]:
            if q[:1] == "X": x = int(q[1:])
            elif q[:1] == "Y": y = int(q[1:])
            elif q[:1] == "K": k = q[1:].strip('"')
        if y is None: y = cy
        cy = y
        cells[(y, x)] = k
    return cells

meta = parse_slk(os.path.join(GD, "UnitMetaData.slk"))
hdr = {meta[(1, x)]: x for (y, x) in meta if y == 1}
FTYPE = {}
# типы-флаги хранятся в w3u как целое число (иначе, например, uaen ломает атаку)
INT_TYPES = {"bool", "attackBits", "deathType", "defenseTypeInt", "detectionType", "teamColor",
             "versionFlags", "channelType", "channelFlags", "morphFlags", "stackFlags",
             "silenceFlags", "spellDetail", "interactionFlags", "fullFlags", "pickFlags"}
for (y, x), k in meta.items():
    if x == hdr["ID"] and y > 1:
        t = meta.get((y, hdr["type"]))
        FTYPE[k] = {"int": 0, "real": 1, "unreal": 2}.get(t, 0 if t in INT_TYPES else 3)
udata = parse_slk(os.path.join(GD, "UnitData.slk"))
BASE_IDS = {k for (y, x), k in udata.items() if x == 1 and y > 1}

# ---------- дизайн ----------
RACES = [  # код, имя, база строителя, базы башен по слотам, тип атаки по слотам, слоты с воздухом
    ("H", "Люди", ["hgtw", "hctw", "hatw", "hgtw"], ["pierce", "siege", "magic", "siege"], {1}),
    ("O", "Орда", ["owtw", "owtw", "owtw", "owtw"], ["pierce", "siege", "magic", "normal"], {1}),
    ("U", "Нежить", ["uzg1", "uzg2", "uzg1", "uzg2"], ["pierce", "normal", "magic", "normal"], {1}),
    ("E", "Нічні ельфи", ["etrp", "etrp", "etrp", "etrp"], ["pierce", "magic", "magic", "pierce"], {1, 2, 4}),
    ("N", "Наги", ["nntt", "nntt", "nntt", "nntt"], ["pierce", "magic", "magic", "normal"], {1, 3}),
    ("G", "Гобліни", ["hctw", "hctw", "hctw", "hctw"], ["pierce", "siege", "magic", "siege"], {1}),
]
NAMES = {  # слот: (ур1, ур2, ветка А, ветка Б)
    "H": [("Сторожова вежа", "Укріплена вежа", "Снайперська", "Кулеметна"),
          ("Гарматна", "Важка гармата", "Мортира", "Вогнемет"),
          ("Святилище", "Собор", "Благословення", "Світло"),
          ("Баліста", "Важка баліста", "Пробиття", "Гарпун")],
    "O": [("Вишка", "Сторожова вишка", "Кровожерлива", "Списоносці"),
          ("Катапульта", "Важка катапульта", "Вогняні снаряди", "Валуни"),
          ("Тотем", "Великий тотем", "Барабани", "Шаман"),
          ("Арена", "Ристалище", "Крит", "Рубаки")],
    "U": [("Зикурат", "Примарна вежа", "Чумний зикурат", "Холодний зикурат"),
          ("Склеп", "М'ясний склеп", "Трупова́зка", "Чумна хмара"),
          ("Обеліск", "Чорна цитадель", "Морозний", "Прокляття"),
          ("Цвинтар", "Некрополь", "Лицар смерті", "Скелети")],
    "E": [("Дерево війни", "Старе дерево", "Лучниця", "Мисливиця"),
          ("Місячний колодязь", "Великий колодязь", "Зорепад", "Місячне світло"),
          ("Дерево мудрості", "Дерево вічності", "Коріння", "Сон"),
          ("Гніздо гіпогрифів", "Сідало", "Тільки повітря", "Шторм воронів")],
    "N": [("Кораловий шпиль", "Припливний шпиль", "Морський змій", "Хвиля"),
          ("Храм глибин", "Святилище глибин", "Вир", "Кислота"),
          ("Сирена", "Морська відьма", "Заморожування", "Крижана хвиля"),
          ("Черепаха-вартова", "Драконяча черепаха", "Проти босів", "Трощення")],
    "G": [("Вогнева точка", "Скорострільна", "Ракетна", "Дробовик"),
          ("Міно-завод", "Мінний цех", "Міни", "Напалм"),
          ("Майстерня", "Лабораторія", "Рентабельність", "Електромережа"),
          ("Гармата-паротяг", "Саперна", "Надважкий", "Касетна бомба")],
}
ICONS = {  # слот: (ур1, ур2, ветка А, ветка Б) - стандартные иконки WC3 (проверяются по gamedata/btn_icons.txt)
    "H": [("HumanWatchTower", "GuardTower", "DwarvenLongRifle", "Rifleman"),
          ("CannonTower", "MortarTeam", "FireForTheCannon", "FlameTower"),
          ("HumanArcaneTower", "Priest", "PriestMaster", "InnerFire"),
          ("DalaranGuardTower", "Knight", "StormHammer", "Ensnare")],
    "O": [("OrcTower", "HeadHunterBerserker", "Berserk", "EnvenomedSpear"),
          ("Catapult", "Demolisher", "LiquidFire", "FireRocks"),
          ("TaurenTotem", "Shaman", "ShamanMaster", "ChainLightning"),
          ("Grunt", "Raider", "CriticalStrike", "Whirlwind")],
    "U": [("Ziggurat", "ZigguratUpgrade", "PlagueCloud", "FrostTower"),
          ("Crypt", "MeatWagon", "Abomination", "DeathTower"),
          ("IceCrownObelisk", "Necromancer", "FrostWyrm", "Curse"),
          ("Graveyard", "Necropolis", "HeroDeathKnight", "SkeletonArcher")],
    "E": [("ElvenGuardTower", "Archer", "HighElvenArcher", "Huntress"),
          ("MoonWell", "CorruptedMoonWell", "Starfall", "PriestessOfTheMoon"),
          ("TreeOfLife", "TreeOfEternity", "EntanglingRoots", "Sleep"),
          ("Hippogriff", "HippogriffRider", "UpgradeMoonGlaive", "Cyclone")],
    "N": [("CoralBed", "TidalGuardian", "WindSerpent", "NagaMyrmidon"),
          ("NagaBurrow", "NagaSummoner", "MurgulTideWarrior", "ShockWave"),
          ("SeaWitch", "NagaSeaWitch", "FrostBolt", "LightningShield"),
          ("SeaTurtleGreen", "SeaTurtleRed", "NagaMyrmidonRoyalGuard", "Impale")],
    "G": [("RockTower", "AdvancedRockTower", "ClusterRockets", "ScatterRockets"),
          ("GoblinLandMine", "GoblinSapper", "ClockWerkGoblin", "AdvancedFlameTower"),
          ("EnergyTower", "AdvancedEnergyTower", "HeroTinker", "OrbOfLightning"),
          ("InfernalCannon", "InfernalFlameCannon", "ROBOGOBLIN", "GoblinZeppelin")],
}
MODELS = {  # слот: (модель ур1, модель ур2) из стандартных зданий WC3
    "H": [("human\\HumanTower\\HumanTower", "other\\DalaranGuardTower\\DalaranGuardTower"),
          ("human\\Blacksmith\\Blacksmith", "human\\Workshop\\Workshop"),
          ("human\\ArcaneSanctum\\ArcaneSanctum", "other\\MageTower\\MageTower"),
          ("human\\HumanBarracks\\HumanBarracks", "human\\GryphonAviary\\GryphonAviary")],
    "O": [("orc\\WatchTower\\WatchTower", "orc\\TrollBurrow\\TrollBurrow"),
          ("orc\\WarMill\\WarMill", "orc\\Beastiary\\Beastiary"),
          ("orc\\SpiritLodge\\SpiritLodge", "orc\\VoodooLounge\\VoodooLounge"),
          ("orc\\TaurenTotem\\TaurenTotem", "orc\\OrcBarracks\\OrcBarracks")],
    "U": [("undead\\Ziggurat\\Ziggurat", "other\\NerubianZiggurat\\NerubianZiggurat"),
          ("undead\\Crypt\\Crypt", "undead\\Slaughterhouse\\Slaughterhouse"),
          ("undead\\TempleOfTheDamned\\TempleOfTheDamned", "undead\\TombOfRelics\\TombOfRelics"),
          ("undead\\Graveyard\\Graveyard", "undead\\Necropolis\\Necropolis")],
    "E": [("nightelf\\AncientProtector\\AncientProtector", "other\\ElvenGuardTower\\ElvenGuardTower"),
          ("nightelf\\MoonWell\\MoonWell", "demon\\CorruptedMoonWell\\CorruptedMoonWell"),
          ("nightelf\\AncientOfLore\\AncientOfLore", "nightelf\\TreeofLife\\TreeofLife"),
          ("nightelf\\ChimaeraRoost\\ChimaeraRoost", "nightelf\\AncientOfWind\\AncientOfWind")],
    "N": [("naga\\TidalGuardian\\TidalGuardian", "naga\\CoralBed\\CoralBed"),
          ("naga\\TempleofTides\\TempleofTides", "naga\\SpawningGrounds\\SpawningGrounds"),
          ("naga\\ShrineOfAshjara\\ShrineOfAshjara", "naga\\AltarOfDepths\\AltarOfDepths"),
          ("other\\ElvenGuardMagicTower\\ElvenGuardMagicTower", "other\\ElvenGuardFireTower\\ElvenGuardFireTower")],
    "G": [("other\\TowerDefenseTower\\TowerDefenseTower", "other\\AmmoDump\\AmmoDump"),
          ("other\\GoblinShipyard\\GoblinShipyard", "other\\Marketplace\\Marketplace"),
          ("other\\Merchant\\Merchant", "other\\MagicVault\\MagicVault"),
          ("demon\\DemonGate\\DemonGate", "other\\DarkPortal\\DarkPortal")],
}
TOWER_MODELS = ("HumanTower", "DalaranGuardTower", "WatchTower", "Ziggurat", "AncientProtector",
                "ElvenGuardTower", "TidalGuardian", "ElvenGuardMagicTower", "ElvenGuardFireTower",
                "TowerDefenseTower", "NerubianZiggurat")

def model(rc, s, li):
    m = MODELS[rc][s][0 if li == 0 else 1]
    small = m.split("\\")[-1] in TOWER_MODELS  # башни в натуральную величину, большие здания ужать
    sc = (1.0 if small else 0.55) * (1.15 if li >= 2 else 1.0)
    return "buildings\\" + m + ".mdl", round(sc, 2)

# эффекты веток: (раса, слот 1-4, ветка) -> (код, a, b, c, d, описание); коды в td_effects.j
# STAT: изменения характеристик (дальность x2, скорострельность x3 при том же уроне в секунду)
EFFECTS = {
    ("H", 1, "A"): (0, 0, 0, 0, 0, "Дальність атаки x2."),
    ("H", 1, "B"): (0, 0, 0, 0, 0, "Стріляє втричі частіше, шкода за постріл менша."),
    ("H", 2, "A"): (4, 300, 0.6, 0, 0, "Мортира: 60% шкоди всім у радіусі 300."),
    ("H", 2, "B"): (3, 0.3, 3, 0, 0, "Вогнемет: підпалює ціль на 3 с."),
    ("H", 3, "A"): (13, 0.2, 600, 0, 0, "Благословення: +20% шкоди баштам у радіусі 600."),
    ("H", 3, "B"): (2, 0.5, 0, 0, 4, "Світло: оглушує ціль на 0,5 с раз на 4 с."),
    ("H", 4, "A"): (7, 0.2, 5, 0, 0, "Пробиття: ціль отримує +20% шкоди 5 с."),
    ("H", 4, "B"): (12, 150, 0, 0, 0, "Гарпун: відкидає ціль назад на 150."),
    ("O", 1, "A"): (14, 0.02, 0.4, 0, 0, "Кровожерливість: +2% шкоди за кожне вбивство, до +40%."),
    ("O", 1, "B"): (5, 1, 1.0, 0, 0, "Списоносці: спис пробиває ще 1 ціль."),
    ("O", 2, "A"): (3, 0.3, 4, 200, 0, "Вогняні снаряди: підпалюють усіх у радіусі 200 на 4 с."),
    ("O", 2, "B"): (2, 0.3, 0, 0, 0, "Валуни: оглушення 0,3 с при кожному влучанні."),
    ("O", 3, "A"): (13, 0.15, 600, 0, 0, "Барабани: +15% шкоди баштам у радіусі 600."),
    ("O", 3, "B"): (5, 3, 0.7, 0, 0, "Шаман: ланцюгова блискавка ще по 3 цілях (70%)."),
    ("O", 4, "A"): (6, 0.2, 3, 0, 0, "Крит: 20% шанс завдати x3 шкоди."),
    ("O", 4, "B"): (4, 200, 0.5, 0, 0, "Рубаки: 50% шкоди всім поруч із ціллю."),
    ("U", 1, "A"): (3, 0.3, 4, 0, 0, "Чума: отрута на 4 с."),
    ("U", 1, "B"): (1, 0.2, 3, 0, 0, "Холод: сповільнення 20% на 3 с."),
    ("U", 2, "A"): (4, 250, 0.5, 0, 0, "Трупова́зка: 50% шкоди всім у радіусі 250."),
    ("U", 2, "B"): (3, 0.25, 4, 250, 0, "Чумна хмара: отрута всім у радіусі 250 на 4 с."),
    ("U", 3, "A"): (1, 0.4, 2, 250, 0, "Мороз: сповільнення 40% всім у радіусі 250 на 2 с."),
    ("U", 3, "B"): (7, 0.2, 5, 0, 0, "Прокляття: ціль отримує +20% шкоди 5 с."),
    ("U", 4, "A"): (8, 0.1, 0, 0, 0, "Страта: добиває ціль, у якої менше 10% здоров'я (не босів)."),
    ("U", 4, "B"): (2, 1.0, 0, 0, 5, "Скелети: тримають ціль 1 с раз на 5 с."),
    ("E", 1, "A"): (5, 2, 0.7, 0, 0, "Лучниця: стріла відскакує ще на 2 цілі (70%)."),
    ("E", 1, "B"): (5, 1, 1.0, 0, 0, "Мисливиця: клинок б'є ще 1 ціль повною шкодою."),
    ("E", 2, "A"): (4, 300, 1.0, 0, 6, "Зорепад: раз на 6 с повна шкода всім у радіусі 300."),
    ("E", 2, "B"): (13, 0.1, 600, 0, 0, "Місячне світло: +10% шкоди баштам у радіусі 600."),
    ("E", 3, "A"): (2, 1.0, 0, 0, 6, "Коріння: тримає ціль 1 с раз на 6 с."),
    ("E", 3, "B"): (2, 2.0, 0, 0, 8, "Сон: присипляє ціль на 2 с раз на 8 с."),
    ("E", 4, "A"): (10, 1.0, 0, 0, 0, "x2 шкоди по літаючих."),
    ("E", 4, "B"): (17, 0.3, 3, 0, 0, "Шторм воронів: сповільнює літаючих на 30%."),
    ("N", 1, "A"): (11, 0.1, 2.0, 0, 0, "Морський змій: +10% шкоди за кожен удар по тій самій цілі, до x3."),
    ("N", 1, "B"): (12, 120, 0, 0, 0, "Хвиля: відкидає ціль назад на 120."),
    ("N", 2, "A"): (1, 0.5, 1.5, 300, 5, "Вир: раз на 5 с сповільнює всіх у радіусі 300 на 50%."),
    ("N", 2, "B"): (7, 0.15, 5, 250, 0, "Кислота: усі в радіусі 250 отримують +15% шкоди 5 с."),
    ("N", 3, "A"): (2, 1.5, 0, 0, 8, "Заморожування: ціль 1,5 с раз на 8 с."),
    ("N", 3, "B"): (1, 0.3, 3, 250, 0, "Крижана хвиля: сповільнення 30% всім у радіусі 250."),
    ("N", 4, "A"): (9, 1.0, 0, 0, 0, "Проти босів: x2 шкоди по босах."),
    ("N", 4, "B"): (2, 0.5, 0, 0, 3, "Трощення: оглушення 0,5 с раз на 3 с."),
    ("G", 1, "A"): (10, 0.5, 0, 0, 0, "Ракети: +50% шкоди по літаючих."),
    ("G", 1, "B"): (5, 2, 0.7, 0, 0, "Дробовик: ще 2 цілі поруч (70%)."),
    ("G", 2, "A"): (4, 250, 1.0, 0, 5, "Міни: раз на 5 с вибух, повна шкода в радіусі 250."),
    ("G", 2, "B"): (3, 0.3, 4, 250, 0, "Напалм: підпалює всіх у радіусі 250 на 4 с."),
    ("G", 3, "A"): (15, 3, 0, 0, 0, "Рентабельність: +3 золота за хвилю (одна на гравця)."),
    ("G", 3, "B"): (1, 0.25, 2, 200, 0, "Електромережа: сповільнення 25% всім у радіусі 200."),
    ("G", 4, "A"): (16, 1.0, 0, 0, 0, "Надважкий снаряд: x2 шкоди по броньованих."),
    ("G", 4, "B"): (4, 250, 0.6, 0, 0, "Касетна бомба: 60% шкоди всім у радіусі 250."),
}
assert len(EFFECTS) == 48
ROLE = {1: "шкода", 2: "площа", 3: "контроль", 4: "ослаблення"}
def _role_fx(rc, slot, lv):  # lv 0 = ур.1, 1 = ур.2
    if slot == 1:
        return (0, 0, 0, 0, 0, "Роль: шкода. Найбільша шкода по одній цілі.")
    if slot == 2:
        if rc in ("U", "G"):
            return (3, (0.15, 0.2)[lv], 3, (150, 200)[lv], 0, f"Роль: площа. {'Отрута' if rc == 'U' else 'Вогонь'} всім у радіусі {(150, 200)[lv]} на 3 с.")
        return (4, (150, 200)[lv], (0.3, 0.4)[lv], 0, 0, f"Роль: площа. {(30, 40)[lv]}% шкоди всім у радіусі {(150, 200)[lv]}.")
    if slot == 3:
        r = 150 if rc in ("N", "U") else 0
        return (1, (0.15, 0.2)[lv], 2, r, 0, f"Роль: контроль. Сповільнення {(15, 20)[lv]}% на 2 с" + (f" всім у радіусі {r}." if r else "."))
    return (7, (0.08, 0.12)[lv], 4, 0, 0, f"Роль: ослаблення. Ціль отримує +{(8, 12)[lv]}% шкоди 4 с.")
ROLE_FX = {(rc, sl, suf): _role_fx(rc, sl, i) for rc in NAMES for sl in range(1, 5) for i, suf in enumerate(("1", "2"))}
EFFECTS.update(ROLE_FX)
# ветка Б меняет тип атаки, ветка А усиливает роль (+15% урона)
BTYPE = {"pierce": "magic", "siege": "pierce", "magic": "siege", "normal": "magic"}
BRANCH_A_DMG = 1.15

BUILDER_ICON = {"H": "Peasant", "O": "Peon", "U": "Acolyte", "E": "Wisp", "N": "MurgalSlave", "G": "HeroTinker"}
_KNOWN_ICONS = {l.strip().lower() for l in open(os.path.join(GD, "btn_icons.txt"))}

def icon(name):
    assert f"btn{name.lower()}.blp" in _KNOWN_ICONS, f"иконки BTN{name} нет в игре"
    return f"ReplaceableTextures\\CommandButtons\\BTN{name}.blp"

SLOT_C = [30, 50, 45, 60]
SLOT_CD = [1.0, 2.0, 1.5, 1.8]
SLOT_RANGE = [700, 550, 600, 800]
# уровень: суффикс, цена улучшения (x C), всего вложено (x C), эффективность DPS/золото, время стройки
LEVELS = [("1", 1.0, 1.0, 0.10, 3), ("2", 1.5, 2.5, 0.11, 5), ("A", 3.0, 5.5, 0.13, 8), ("B", 3.0, 5.5, 0.12, 8)]

KINDS = [  # имя, подсказка, база, броня, защита, скорость, передвижение, кол-во, способности
    ("Звичайні", "Підійде будь-яка шкода.", "ngno", "medium", 0, 270, "foot", 20, ""),
    ("Швидкі", "Потрібні пронизливі башти й сповільнення.", "nwlt", "small", 0, 400, "foot", 24, ""),
    ("Броньовані", "Потрібна магія або облога.", "nogr", "large", 2, 240, "foot", 14, ""),
    ("Повітря", "Тільки башти з атакою по повітрю!", "ugar", "small", 0, 300, "fly", 16, ""),
    ("Магічні", "Імунні до магії: звичайна й облогова шкода.", "nsat", "medium", 0, 270, "foot", 18, "ACmi"),
    ("Облогові", "Укріплена броня: потрібна облога.", "nmyr", "fort", 1, 220, "foot", 12, ""),
    ("Лікарі", "Добивайте швидко, вони лікують одне одного.", "hmpr", "none", 0, 270, "foot", 18, ""),
    ("БОС", "Один, але дуже товстий. Контроль і шкода по одній цілі.", "uabo", "hero", 3, 230, "foot", 1, ""),
]
WAVES = 45
BOSS = {10, 20, 30, 40, 45}
CYCLE = [0, 1, 2, 3, 4, 5, 6, 0, 1]
# кто именно идёт: варианты по типу волны (база WC3, имя), чередуются от волны к волне
CREEPS = {
    0: [("ngno", "Гноли"), ("nkob", "Кобольди"), ("nmrl", "Мурлоки"), ("nftr", "Лісові тролі")],
    1: [("nwlt", "Вовки"), ("ncen", "Кентаври-бігуни"), ("nwlg", "Гігантські вовки")],
    2: [("nogr", "Огри"), ("ngrk", "Големи"), ("nogm", "Огри-громили")],
    3: [("ugar", "Горгульї"), ("nhar", "Гарпії"), ("nhrr", "Гарпії-бурі")],
    4: [("nsat", "Сатири"), ("nsts", "Сатири-шахраї"), ("nsrh", "Пекельні сатири")],
    5: [("nmyr", "Мірмідони"), ("nthl", "Громові ящери")],
    6: [("hmpr", "Жерці"), ("nfsp", "Тролі-шамани"), ("ndtr", "Темні тролі")],
}
BOSSES = {10: ("hsor", "Алла"), 20: ("nsgt", "Королева павуків"), 30: ("nhyd", "Гідра"),
          40: ("ntrs", "Морська черепаха-велетень"), 45: ("uabo", "Король погані")}
# броня и подсказка по типу: что брать против
ARMOR = {0: "середня броня; б'є все",
         1: "легка броня, швидкі; найкраще пронизливі й сповільнення",
         2: "важка броня; потрібні магія й облога, пронизливі слабкі",
         3: "літають! б'ють тільки башти з атакою по повітрю",
         4: "імунні до магії; потрібні звичайні, облогові й пронизливі",
         5: "укріплена броня; потрібна облога, решта слабка; ламають ворота",
         6: "лікують одне одного; добивайте швидко, шкода по площі",
         7: "один, величезне здоров'я, броня героя; 10 життів за прорив; контроль слабший"}

ATK_DESC = {
    "pierce": "пронизлива: сильна по легкій броні (швидкі, повітря), слабка по важкій і укріпленій",
    "siege": "облогова: сильна по укріпленій броні (облогові), слабка по легкій",
    "magic": "магічна: сильна по важкій броні (броньовані), не б'є імунних до магії",
    "normal": "звичайна: сильна по середній броні, слабка по укріпленій",
    "chaos": "хаос: повна шкода по будь-якій броні",
}

def wave_creep(w):
    if w in BOSS:
        return BOSSES[w]
    k = wave_kind(w)
    n = sum(1 for v in range(1, w) if v not in BOSS and wave_kind(v) == k)
    return CREEPS[k][n % len(CREEPS[k])]
HPSCALE = 2.0  # общая сложность: здоровье мобов x2 (v0.16 на Нормальном было слишком легко)
HPMAX = 1.25  # запас макс. HP для Харда и 5-6 игроков: в игре HP режется до нужного множителя

def wave_kind(w):
    return 7 if w in BOSS else CYCLE[(w - 1) % len(CYCLE)]

def lane_hp(w):  # Нормальный, 4 игрока, без контрактов (см. balance/sim.py)
    hp = 0.1 * 25 * 0.38 * (150 + 28 * w + 0.4 * w * w) * (1.025 ** w)
    return hp * (1.3 if w in BOSS else 1.0)

# ---------- w3a ----------
BLINK = "Atdb"
ameta = parse_slk(os.path.join(GD, "AbilityMetaData.slk"))
ahdr = {ameta[(1, x)]: x for (y, x) in ameta if y == 1}
ATYPE = {}
for (y, x), k in ameta.items():
    if x == ahdr["ID"] and y > 1:
        t = ameta.get((y, ahdr["type"]))
        ATYPE[k] = ({"int": 0, "real": 1, "unreal": 2}.get(t, 0 if t in INT_TYPES else 3),
                    int(ameta.get((y, ahdr["data"])) or 0))

def amod(fid, val, lvl=0):
    t, dat = ATYPE[fid]
    b = fid.encode() + struct.pack("<iii", t, lvl, dat)
    if t == 0: b += struct.pack("<i", int(val))
    elif t in (1, 2): b += struct.pack("<f", float(val))
    else: b += str(val).encode("utf-8") + b"\0"
    return b + struct.pack("<i", 0)

def build_w3a():
    mods = [amod("aher", 0), amod("alev", 1), amod("acdn", 0.5, 1), amod("amcs", 0, 1),
            amod("aran", 99999, 1), amod("Ebl1", 99999, 1), amod("Ebl2", 0, 1),
            amod("abpx", 2), amod("abpy", 1), amod("anam", "Телепорт"), amod("ahky", "D"),
            amod("atp1", "Телепорт (|cffffcc00D|r)", 1),
            amod("aub1", "Миттєво переносить героя в будь-яку видиму точку мапи. Перезарядка 0,5 с.", 1)]
    objs = [b"AEbl" + BLINK.encode() + struct.pack("<i", len(mods)) + b"".join(mods)]
    objs.append(channel(AB_RESEARCH, "Дослідження раси", ["Усі твої башти +15% шкоди (до 8 разів). Ціна зростає: 40, 95, 157 ..."], "Scout", 0, 0.5, 0, "berserk", 0, 2))
    objs.append(channel(AB_UP, "Покращити героя", ["Атаки героя +10%, шкода по ньому -3%. До 10 разів. Ціна: 100, 150, 200 ... (+50 за кожне)."], "StatUp", 0, 0.5, 0, "cripple", 2, 2, hot="U"))
    objs.append(channel(AB_CALL, "Викликати хвилю зараз", ["Готові раніше? Наступна хвиля виходить одразу, а кожен гравець отримує +1 золото за кожну секунду таймера, що лишилася."], "BattleStations", 0, 2, 0, "curse", 3, 2, hot="V"))
    objs.append(channel(AB_CONTRACT, "Контракт (40 золота)", ["+4 доходу кожну хвилю назавжди (у Сані +7), але моби твоєї лінії +2,5% здоров'я. До 12 контрактів."], "SnazzyScroll", 0, 0.5, 0, "darksummoning", 0, 1, hot="K"))
    objs.append(channel(AB_SCOUT, "Розвідка", ["Хто йде наступною хвилею: броня, особливість, що проти неї будувати."], "Spy", 0, 1, 0, "innerfire", 2, 1, hot="N"))
    hm = [amod("alev", 11), amod("anam", "Бонус здоров'я боса")]
    for L in range(1, 12):
        hm.append(amod("Ilif", 0 if L == 1 else -100 * 2 ** (L - 2), L))
    objs.append(b"AIlf" + b"Qhpb" + struct.pack("<i", len(hm)) + b"".join(hm))
    objs.append(channel(AB_HELP, "Допомогти союзнику (50 золота)", ["Віддати 50 золота найбіднішому союзнику (податок 10%). До 100 за хвилю."], "ChestOfGold", 0, 1, 0, "rejuvination", 3, 1, hot="G"))
    objs.append(channel(AB_ENDLESS, "Безодня", ["Увімкнути нескінченний режим (до 45 хвилі): після 45 ще 15 хвиль з елітних мобів, до 60. Вирішує один гравець за всіх!"], "DeathPact", 0, 1, 0, "deathanddecay", 1, 1, hot="E"))
    objs.append(channel(AB_GATE, "Ворота (80 золота)", ["Поставити ворота на дорогу своєї смуги (до 3). Тримають мобів, доки не зламаються; лагодяться щохвилі, облогові ламають назовсім."], "Fortress", 2, 1, 0, "blizzard", 1, 2))
    # стандартная «Строить» (AUbu) - во второй ряд, чтобы третий ряд был под навыки
    au = [amod("abpx", 1), amod("abpy", 1)]
    orig = b"AUbu" + b"\0\0\0\0" + struct.pack("<i", len(au)) + b"".join(au)
    for h in range(6):
        for j in range(4):
            nm, tip, vals, ico, tt, cd, area, tgt = SKILLS[h][j]
            how = {0: "Натиснути, без цілі.", 1: "Вказати моба." if tgt == "e" else "Вказати свою башту.", 2: "Вказати точку на землі."}[tt]
            tips = [tip.format(v=v) + "|n|n" + how + f" Перезарядка {cd} с." for v in vals]
            if len(vals) > 1:
                learn = tip.format(v=" / ".join(vals)) + "|n|nВивчається на 1, 3 і 5 рівні героя. " + how + f" Перезарядка {cd} с."
            else:
                learn = tip.format(v="") + "|n|n|cffffcc00Головна навичка, вивчається з 6 рівня героя.|r " + how + f" Перезарядка {cd} с."
            if tgt == "t":
                how_t = "|n|cff80c0ffЦіль: своя башта.|r"
                tips = [t + how_t for t in tips]
                learn += how_t
            objs.append(channel(skill_id(h, j), nm, tips, ico, tt, cd, area, HERO_ORDERS[j], j, 2,
                                hero=True, req=6 if j == 3 else 1, learn=learn, tgt=tgt, hot=HOTKEYS[j]))
    return struct.pack("<ii", 2, 1) + orig + struct.pack("<i", len(objs)) + b"".join(objs)

# ---------- герои, навыки, ворота, ультимативные башни ----------
AB_RESEARCH, AB_GATE, GATE_ID = "Ares", "Agat", "gat0"
AB_UP, AB_CALL, AB_CONTRACT, AB_ENDLESS = "Qhup", "Qcal", "Qkon", "Qend"
AB_SCOUT, AB_HELP = "Qnxt", "Qgiv"
# (id, база, класс, имя друга, иконка-портрет)
HEROES = [
    ("Hsan", "Nalc", "Банкір", "Саня"),
    ("Hali", "Hpal", "Комендант", "Алік"),
    ("Hdim", "Hamg", "Стратег", "Діма"),
    ("Hyur", "Obla", "Мисливець", "Ден"),
    ("Hles", "Hmkg", "Підривник", "Льоша"),
    ("Hvit", "Ulic", "Морозильник", "Віталік"),
]
# навыки по героям: (имя, описание, иконка, цель 0 нет/1 юнит/2 точка, перезарядка, радиус)
# навыки: (имя, описание с {v}, значения по уровням, иконка, цель 0 нет/1 моб/2 точка, перезарядка, радиус)
# обычные навыки 3 уровня (изучаются на 1, 3, 5 уровне героя), главный 1 уровень (с 6 уровня)
# навыки: (имя, описание с {v}, значения по уровням, иконка, цель 0 нет/1 юнит/2 точка, перезарядка, радиус, кого)
# кого: 'e' мобы, 't' своя башня. Первые три качаются до 3 уровня (на 1, 3, 5 уровне героя), четвёртый главный (с 6).
SKILLS = [
    [("Метальна пляшка", "Шкода всім у радіусі 200 ({v} здоров'я моба), вони отримують +15% шкоди 4 с.", ["30%", "45%", "60%"], "Transmute", 2, 10, 200, "e"),
     ("Полювання за головами", "15 с кожен моб, убитий Санею або його найманцем, дає +{v} золота зверху.", ["3", "5", "8"], "ChestOfGold", 0, 40, 0, "e"),
     ("Найманець", "Огр-охоронець на {v} с: б'є мобів і тримає їх на собі. Його вбивства як Санині.", ["20", "30", "40"], "Charm", 0, 45, 0, "e"),
     ("Золотий дощ", "20 с кожне вбивство моба будь-якою баштою команди дає +1 золота кожному гравцю.", [""], "Starfall", 0, 240, 0, "e")],
    [("Удар щитом", "Шкода всім поруч з Аліком ({v} здоров'я моба) і оглушення.", ["40%, 1 с", "60%, 1,5 с", "80%, 2 с"], "Bash", 0, 12, 250, "e"),
     ("Провокація", "Усі моби в радіусі 600 кидають дорогу і б'ють тільки Аліка {v} с.", ["3", "4", "5"], "Taunt", 0, 15, 600, "e"),
     ("Святе світло", "Вилікувати себе на {v} здоров'я і полагодити свої ворота на 30%.", ["150", "300", "450"], "HolyBolt", 0, 25, 0, "e"),
     ("Фортеця", "8 с Алік отримує на 70% менше шкоди, моби поруч б'ють тільки його, башти лінії +25% шкоди. Може загинути!", [""], "Fortress", 0, 180, 0, "e")],
    [("Кислота", "Моби в радіусі 250 отримують +{v} шкоди від усіх 8 с.", ["20%", "30%", "40%"], "AcidBomb", 2, 8, 250, "e"),
     ("Тактика", "+{v} шкоди твоїй і сусіднім лініям на 15 с.", ["10%", "20%", "30%"], "Command", 0, 40, 0, "e"),
     ("Підкріплення", "Тимчасова башта своєї раси (рів.2) у точці на {v} с.", ["45", "60", "75"], "CallToArms", 2, 60, 0, "e"),
     ("План битви", "Усі башти команди +30% шкоди на 20 с.", [""], "BattleRoar", 0, 240, 0, "e")],
    [("Ривок", "Стрибок до моба й удар на {v} здоров'я моба. Якщо вбив, усі навички Дена одразу готові (не частіше разу на 10 с).", ["100%", "140%", "180%"], "CriticalStrike", 1, 10, 0, "e"),
     ("Мітка", "Моб отримує +{v} шкоди від усіх 6 с (бос 12 с).", ["20%", "30%", "40%"], "MarkOfFire", 1, 10, 0, "e"),
     ("Інстинкт", "8 с атаки Дена завдають +{v} шкоди.", ["40%", "60%", "80%"], "BloodLust", 0, 25, 0, "e"),
     ("Страта", "Добити моба, у якого менше 25% здоров'я (боса менше 10%). Якщо добив, усі навички Дена одразу знову готові.", [""], "WhirlWind", 1, 30, 0, "e")],
    [("Граната", "Шкода всім у радіусі 250 ({v} здоров'я моба) і оглушення 1 с.", ["30%", "45%", "60%"], "ThunderClap", 2, 15, 250, "e"),
     ("Мінне поле", "5 вибухів у точці, кожен {v} здоров'я моба.", ["20%", "25%", "30%"], "GoblinLandMine", 2, 40, 300, "e"),
     ("Динамітна башта", "Башта-ціль 10 с б'є по площі: {v} шкоди всім поруч із ціллю.", ["40%", "60%", "80%"], "ClusterRockets", 1, 25, 0, "t"),
     ("Килимове бомбардування", "Шкода всім мобам твоєї лінії (40% здоров'я моба, босу 20%).", [""], "WarStomp", 0, 180, 0, "e")],
    [("Крижана стріла", "Шкода {v} здоров'я моба цілі й усім у радіусі 200, сповільнення на 3 с.", ["35% і 30%", "52% і 40%", "70% і 50%"], "FrostBolt", 1, 8, 0, "e"),
     ("Крижана стіна", "Усі моби в точці (радіус 350) стоять {v} с.", ["2", "2,5", "3"], "FrostArmor", 2, 20, 350, "e"),
     ("Морозна башта", "Башта-ціль 15 с сповільнює кожного, в кого влучила, на {v} на 2 с.", ["30%", "40%", "50%"], "Blizzard", 1, 20, 0, "t"),
     ("Вічна зима", "Усі моби твоєї лінії стоять 4 с.", [""], "FreezingBreath", 0, 180, 0, "e")],
]
HERO_ORDERS = ["ambush", "animatedead", "battleroar", "bearform"]
HOTKEYS = ["Q", "W", "E", "R"]
# роли героев (v0.24): здоровье = uhpm + сила x25; броня udef; дальний бой - дальность
HERO_RANGED = [False, False, True, False, True, True]
HERO_RANGE = {2: 600, 4: 400, 5: 800}
HERO_STATS = [  # uhpm, сила, сила за уровень, броня
    (600, 24, 3.2, 4),   # Саня: здоровяк
    (400, 24, 3.0, 8),   # Алик: танк
    (100, 16, 1.6, 2),   # Дима: ослабитель
    (150, 18, 2.0, 2),   # Ден: убийца
    (250, 20, 2.2, 3),   # Леша: толпа
    (50, 15, 1.5, 1),    # Виталик: дальник
]
HQ_ID, DECOY_ID = "hq00", "dcoy"
HERO_MISSILE = [
    None,
    None,
    None,  # Дима: своя атака архимага
    None,
    "Abilities\\Spells\\Human\\StormBolt\\StormBoltMissile.mdl",
    None,  # Виталик: своя атака лича
]
HERO_TIPS = [
    "Здоровань-банкір, ближній бій. Найбільше здоров'я, вампіризм 20%. Плюс: контракт +7 доходу. Мінус: перші 10 хвиль дохід -3.",
    "Танк, ближній бій. Броня 8, шкода по ньому -25%, тримає мобів на собі. Плюс: ворота за 40 і міцніші. Мінус: башти слота 1 -12% шкоди.",
    "Послаблювач, дальній бій 600. Знімає броню, посилює башти. Плюс: аура +10% шкоди трьом лініям. Мінус: не більше 10 башт.",
    "Вбивця, ближній бій. Кожен 4-й удар x2,5. Плюс: башти +60% по босах. Мінус: звичайні хвилі його лінії +12% здоров'я.",
    "Підривник, дальній бій 400. Атака б'є 30% по площі. Плюс: башти слота 2 +60% шкоди. Мінус: боси -10% шкоди від його лінії.",
    "Дальник, дальній бій 800. Атаки сповільнюють на 20%, біля дороги крихкий. Плюс: контроль лінії +20% довше. Мінус: дослідження на 30% дорожчі.",
]
def hero_id(h, ri):
    return f"H{h}{RACES[ri][0].lower()}0"

def skill_id(h, j):
    return f"A{h}{j}s"
ULT = {  # раса: (название, модель, масштаб, иконка, эффект (код, a, b, c, d), описание)
    "H": ("Цитадель Світла", "human\\TownHall\\TownHall", 0.5, "Castle", (5, 2, 1.0, 0, 0), "Б'є ще 2 цілі повною шкодою."),
    "O": ("Жертовник Громмаша", "orc\\GreatHall\\GreatHall", 0.5, "GreatHall", (11, 0.1, 2.0, 0, 0), "Шкода по одній цілі зростає до x3."),
    "U": ("Трон Морозу", "other\\Frostmourne\\Frostmourne", 1.0, "Frostmourne", (1, 0.3, 2, 400, 0), "Сповільнює всіх у радіусі 400 на 30%."),
    "E": ("Світове дерево", "nightelf\\AncientOfWar\\AncientOfWar", 0.6, "TreeOfEternity", (10, 1.0, 0, 0, 0), "x2 шкоди по літаючих."),
    "N": ("Кракен", "other\\DragonBuildingBlue\\DragonBuildingBlue", 0.6, "NagaMyrmidon", (9, 1.0, 0, 0, 0), "x2 шкоди по босах."),
    "G": ("Цепелін-бомбардувальник", "other\\DragonRoost\\DragonRoost", 0.5, "GoblinZeppelin", (4, 300, 0.8, 0, 0), "80% шкоди всім у радіусі 300."),
}
ULT_COST, ULT_DPS, ULT_CD, ULT_RANGE = 500, 170, 1.0, 900

TARGETS = {"e": "air,ground,enemies,vulnerable,invulnerable",
           "t": "structure,friend,player,vulnerable,invulnerable"}

def channel(aid, name, tips, ico, ttype, cd, area, order, bx, by, hero=False, req=1, learn="", tgt="e", hot=""):
    """Пустой навык Channel: всю логику делает TD_OnSpell. tips: описание на каждый уровень."""
    flags = 1 | (2 if area else 0)
    n = len(tips)
    mods = [amod("aher", 1 if hero else 0), amod("alev", n), amod("anam", name),
            amod("aart", icon(ico)), amod("arar", icon(ico)), amod("abpx", bx), amod("abpy", by)]
    if hot:
        mods.append(amod("ahky", hot))
    if hero:
        mods += [amod("arlv", req), amod("alsk", 2), amod("arpx", bx), amod("arpy", 0),
                 amod("aret", f"Вивчити: {name} - рівень %d"), amod("arut", learn)]
    for L in range(1, n + 1):
        mods += [amod("atp1", name + (f" (рівень {L})" if n > 1 else ""), L), amod("aub1", tips[L - 1], L),
                 amod("acdn", cd, L), amod("amcs", 0, L), amod("aran", 99999 if ttype == 2 else 900, L),
                 amod("aare", area, L), amod("atar", TARGETS[tgt], L),
                 amod("Ncl1", 0, L), amod("Ncl2", ttype, L), amod("Ncl3", flags, L), amod("Ncl4", 0, L),
                 amod("Ncl5", 0, L), amod("Ncl6", order, L)]
    return b"ANcl" + aid.encode() + struct.pack("<i", len(mods)) + b"".join(mods)

# ---------- w3u ----------
def mod(fid, val):
    t = FTYPE.get(fid)
    assert t is not None, f"нет поля {fid}"
    b = fid.encode() + struct.pack("<i", t)
    if t == 0: b += struct.pack("<i", int(val))
    elif t in (1, 2): b += struct.pack("<f", float(val))
    else: b += str(val).encode("utf-8") + b"\0"
    return b + struct.pack("<i", 0)

def unit(base, new, fields, hero=False):
    assert base in BASE_IDS, f"нет базового юнита {base}"
    assert len(new) == 4
    assert new[0].isupper() == hero, f"{new}: заглавная первая буква только у героев"
    mods = [mod(k, v) for k, v in fields.items()]
    return base.encode() + new.encode() + struct.pack("<i", len(mods)) + b"".join(mods)

def tower_tip(rc, rname, s, suf, dps, atk, air):
    names = NAMES[rc][s]
    eA, eB = EFFECTS[(rc, s + 1, "A")][5], EFFECTS[(rc, s + 1, "B")][5]
    rng = SLOT_RANGE[s] * (2 if (rc, s + 1, suf) == ("H", 1, "A") else 1)
    t = [f"|cffffcc00{rname}.|r Шкода ~{round(dps)} за секунду, дальність {rng}.",
         "Атака " + ATK_DESC[atk] + ".",
         "|cff80ff80Б'є по повітрю.|r" if air else "|cffff8080По повітрю не б'є.|r"]
    if suf in ("1", "2"):
        t.append("|cff80c0ff" + ROLE_FX[(rc, s + 1, suf)][5] + "|r")
    if suf in ("A", "B"):
        t.append(f"|cff80c0ffЕфект:|r {eA if suf == 'A' else eB}")
    elif suf == "1":
        t.append(f"|cff80c0ffРозвиток:|r рів.2 {names[1]}, потім на вибір:")
    else:
        t.append("|cff80c0ffПокращення на вибір:|r")
    if suf in ("1", "2"):
        t.append(f"А) {names[2]}, посилює роль (+15% шкоди). {eA}")
        t.append(f"Б) {names[3]}, атака стане «{ATK_DESC[BTYPE[atk]].split(':')[0]}». {eB}")
    return "|n".join(t)

# урон мобов по герою (за удар), растёт с волной; летающие не бьют
# v0.25: летуны бьют слабо (0.4), боссы x3 плюс удар по земле в JASS; маги и лекари стреляют на 600
CREEP_DMG_MULT = {0: 1.0, 1: 0.7, 2: 1.4, 3: 0.4, 4: 1.0, 5: 1.5, 6: 0.4, 7: 3.0}
CREEP_RANGED = {4, 6}
CREEP_CD = 1.2

def creep_dmg(k, w):
    return round((24 + 0.8 * w) * CREEP_DMG_MULT[k] * CREEP_CD)

def creep_attack(k, w):
    if CREEP_DMG_MULT[k] == 0:
        return {"uaen": 0}
    f = {"uaen": 1, "ua1t": "normal", "ua1b": max(1, creep_dmg(k, w) - 1), "ua1d": 1, "ua1s": 1,
         "ua1c": CREEP_CD, "uacq": 350, "ua1g": "ground"}
    if k in CREEP_RANGED:
        f.update({"ua1r": 600, "uacq": 650, "ua1w": "missile", "ua1z": 900,
                  "ua1m": r"Abilities\Weapons\ChimaeraLightningMissile\ChimaeraLightningMissile.mdl"})
    return f

def ult_id(rc):
    return f"t{rc.lower()}5u"

def build_objects():
    units, builders, wave_units = [], {}, {}
    for ri, (rc, rname, bases, atks, air) in enumerate(RACES):
        lvl1 = []
        for s in range(4):
            C = SLOT_C[s]
            names = NAMES[rc][s]
            for li, (suf, upc, tot, eff, bt) in enumerate(LEVELS):
                uid = f"t{rc.lower()}{s + 1}{suf.lower()}"  # строчная первая буква = не герой
                if suf == "1": lvl1.append(uid)
                dps = C * tot * eff
                dmg = max(1, round(dps * SLOT_CD[s]) - 1)  # кость 1d1 даёт +1
                up = {"1": f"t{rc.lower()}{s + 1}2", "2": f"t{rc.lower()}{s + 1}a,t{rc.lower()}{s + 1}b"}.get(suf, "")
                nm = names[min(li, 3)]
                lvlname = {"1": "рів.1", "2": "рів.2", "A": "рів.3 А", "B": "рів.3 Б"}[suf]
                f = {
                    "unam": f"{nm} ({lvlname})", "ugol": round(C * upc), "ulum": 0, "ubld": bt, "urac": "undead",
                    "uhpm": {"1": 400, "2": 700, "A": 1100, "B": 1100}[suf], "ufoo": 0, "ufma": 0, "ureq": "", "upar": "", "upgr": "",
                    "uaen": 1, "ua1t": atks[s], "ua1b": dmg, "ua1d": 1, "ua1s": 1,
                    "ua1c": SLOT_CD[s], "ua1r": SLOT_RANGE[s], "uacq": SLOT_RANGE[s],  # дальность захвата = дальность атаки, иначе башня сама не целится
                    "ua1g": "air,ground" if (s + 1) in air else "ground",
                    "uabi": "", "uupt": up, "uico": icon(ICONS[rc][s][li]), "umdl": model(rc, s, li)[0], "usca": model(rc, s, li)[1],
                    # кнопки: в меню стройки ур.1 занимают первый ряд слева направо;
                    # в карточке башни кнопки улучшений встают после «Атаки» и «Стоп»
                    "ubpx": s if suf == "1" else {"2": 2, "A": 2, "B": 3}[suf], "ubpy": 0,
                    "ulur": 0, "utip": ("Побудувати: " if suf == "1" else "Покращити до: ") + f"{nm} ({lvlname})",
                    "utub": tower_tip(rc, rname, s, suf, dps, atks[s], (s + 1) in air),
                }
                if suf == "B":
                    f["ua1t"] = BTYPE[atks[s]]
                    f["utub"] = tower_tip(rc, rname, s, suf, dps, BTYPE[atks[s]], (s + 1) in air)
                if suf == "A":
                    f["ua1b"] = max(1, round(dps * BRANCH_A_DMG * SLOT_CD[s]) - 1)
                    f["utub"] = tower_tip(rc, rname, s, suf, dps * BRANCH_A_DMG, atks[s], (s + 1) in air)
                if (rc, s + 1, suf) == ("H", 1, "A"):
                    f["ua1r"] = f["uacq"] = SLOT_RANGE[s] * 2
                if (rc, s + 1, suf) == ("H", 1, "B"):
                    f["ua1c"] = round(SLOT_CD[s] / 3, 3)
                    f["ua1b"] = max(1, round(dps * SLOT_CD[s] / 3) - 1)
                # самонаводящийся снаряд у всех: артиллерия (пушки, древа) бьёт в точку и мажет по бегущим
                f["ua1w"] = "missile"
                f["ua1z"] = 1100
                if rc == "E":
                    f["upat"] = r"PathTextures\4x4SimpleSolid.tga"
                    f["ua1m"] = [r"Abilities\Weapons\Arrow\ArrowMissile.mdl",
                                 r"Abilities\Weapons\MoonPriestessMissile\MoonPriestessMissile.mdl",
                                 r"Abilities\Weapons\DryadMissile\DryadMissile.mdl",
                                 r"Abilities\Weapons\GlaiveMissile\GlaiveMissile.mdl"][s]
                units.append(unit(bases[s], uid, f))
        nm, mdl, sc, uico, eff, udesc = ULT[rc]
        units.append(unit(bases[0], ult_id(rc), {
            "unam": nm, "ugol": ULT_COST, "ulum": 0, "ubld": 30, "urac": "undead", "uhpm": 2000, "ufoo": 0, "ufma": 0,
            "ureq": "", "upar": "", "upgr": "", "uupt": "", "uabi": "", "ulur": 0,
            "uaen": 1, "ua1t": "chaos", "ua1b": ULT_DPS - 1, "ua1d": 1, "ua1s": 1, "ua1c": ULT_CD,
            "ua1r": ULT_RANGE, "uacq": ULT_RANGE, "ua1g": "air,ground", "ua1w": "missile", "ua1z": 1100,
            "uico": icon(uico), "umdl": "buildings\\" + mdl + ".mdl", "usca": sc, "ubpx": 0, "ubpy": 1,
            "utip": "Побудувати: " + nm + " (ультимативна)",
            "utub": f"Ультимативна башта. З 30 хвилі, потрібно 3 дослідження, одна на гравця. Шкода ~{ULT_DPS} за секунду, хаос, б'є по повітрю. " + udesc,
        }))
        builders[ri] = lvl1 + [ult_id(rc)]
    for h, (hid, base, cls, friend) in enumerate(HEROES):
        for ri, (rc, rname, *_r) in enumerate(RACES):
            f = {"unam": f"{cls} ({rname})", "upro": friend, "uhab": ",".join(skill_id(h, j) for j in range(4)),
                 "uabi": f"AUbu,{BLINK},AInv", "urac": "undead", "ubui": ",".join(builders[ri]), "umvs": 400, "ufoo": 0,
                 "utub": HERO_TIPS[h]}
            hp, st, stp, de = HERO_STATS[h]
            f.update({"uhpm": hp, "ustr": st, "ustp": stp, "udef": de})
            if HERO_RANGED[h]:
                r = HERO_RANGE[h]
                f.update({"uacq": r + 100, "ua1r": r, "ua1w": "missile", "ua1z": 1200, "ua1g": "air,ground"})
                if HERO_MISSILE[h]:
                    f["ua1m"] = HERO_MISSILE[h]
            else:
                f.update({"uacq": 500})
            units.append(unit(base, hero_id(h, ri), f, hero=True))
    units.append(unit("htow", HQ_ID, {
        "unam": "Штаб", "uabi": f"Avul,{AB_RESEARCH},{AB_GATE},{AB_UP},{AB_CALL},{AB_CONTRACT},{AB_ENDLESS},{AB_SCOUT},{AB_HELP}", "ubui": "", "utra": "", "ures": "", "uupt": "",
        "ufma": 0, "ufoo": 0, "uhpm": 5000, "usca": 0.45, "uico": icon("Castle"),
        "utub": "Штаб смуги: Дослідження, Ворота, Покращити героя, Викликати хвилю, Контракт, Безодня, Розвідка, Допомогти союзнику.",
    }))
    # вызов босса: здоровье задаётся в игре от волны, бьют героев и башни
    CH_ATK = {"uaen": 1, "ua1t": "normal", "ua1d": 1, "ua1s": 1, "uacq": 500, "ua1g": "ground,structure",
              "ufoo": 0, "ubdi": 0, "ubba": 0, "ubsi": 0, "uhpr": 0.0, "umvs": 270}
    RNG = {"ua1r": 600, "uacq": 650, "ua1w": "missile", "ua1z": 900,
           "ua1m": r"Abilities\Weapons\ChimaeraLightningMissile\ChimaeraLightningMissile.mdl"}
    for b, row in enumerate(BS.B):
        (nm, lb, lsc, cls, ln, lhp, mn, mb, mcnt, mr, mhp, mech, per, pas, pk, pt, leak, say, tip) = row
        for t in range(3):
            units.append(unit(lb, BS.lead_id(b, t), {**CH_ATK,
                "unam": nm + BS.TIER_NAME[t], "uhpm": 100, "ua1b": BS.DMG[cls][t], "ua1c": BS.CD[cls],
                "usca": lsc, "udef": BS.ARMOR[cls] + BS.TIER_ARMOR[t], "umvs": 200 if nm == "Ждун" else 270,
                "utub": f"Бос виклику №{b + 1}. {tip}"}))
            if mcnt:
                f = {**CH_ATK, "unam": mn + BS.TIER_NAME[t], "uhpm": 100,
                     "ua1b": round(BS.DMG["M"][t] * (0.8 if mr else 1.0)), "ua1c": BS.CD["M"],
                     "udef": BS.ARMOR["M"] + BS.TIER_ARMOR[t], "utub": f"Почет боса «{nm}»."}
                if mr:
                    f.update(RNG)
                units.append(unit(mb, BS.min_id(b, t), f))
    units.append(unit("ngme", "shop", {
        "unam": "Крамниця", "uabi": "Avul,Aneu,Apit,Asid,Asud", "ufoo": 0,
        "usei": "phea,pghe,pman,rat6,rat9,rde1,bspd,rlif,gcel,ratc,rde3",
        "useu": "pcou,prep",
        "utub": "Крамниця: підійди героєм, щоб купити предмети або посильного. Непотрібний предмет можна продати: перетягни його на крамницю."}))
    units.append(unit("hpea", "prep", {
        "unam": "Ремонтник", "uabi": "Ahrp", "ubui": "", "ugol": 75, "ulum": 0, "uhpm": 250, "umvs": 300, "ufoo": 0,
        "usma": 3, "usrg": 30, "usst": 0, "upri": 1,
        "utip": "Купити: Ремонтник", "utub": "Лагодить твої башти (правий клік по башті або кнопка Ремонт). Не б'ється, моби можуть його вбити."}))
    units.append(unit("ndog", "pcou", {
        "unam": "Посильний", "uaen": 0, "uabi": "Aihn", "ugol": 60, "ulum": 0, "uhpm": 400, "umvs": 420, "ufoo": 0,
        "usma": 2, "usrg": 30, "usst": 0, "upri": 1,
        "utip": "Купити: Посильний", "utub": "Не атакує. Два слоти для предметів: носить речі від крамниці до героя."}))
    units.append(unit("ncop", "ccir", {
        "unam": "Коло виклику", "uabi": "Avul", "ufoo": 0, "usca": 1.4,
        "utub": "Стань героєм у коло на 3 с, щоб викликати боса (раз за хвилю, з 3 хвилі)."}))
    units.append(unit("hfoo", DECOY_ID, {
        "unam": "Міраж Дена", "uhpm": 300, "uaen": 0, "umvs": 0, "ufoo": 0, "uabi": "",
        "umdl": "units\\orc\\HeroBladeMaster\\HeroBladeMaster.mdl", "uico": icon("HeroBlademaster"),
    }))
    units.append(unit("hfoo", GATE_ID, {
        "unam": "Ворота", "uhpm": 1000, "umvs": 0, "ucol": 0, "uaen": 0, "uabi": "Avul", "ufoo": 0,
        "umdl": "buildings\\human\\Farm\\Farm.mdl", "usca": 0.6, "uico": icon("Fortress"),
    }))
    for w in range(1, WAVES + 1):
        k = wave_kind(w)
        nm, tip, _b, dty, de, spd, mv, cnt, abil = KINDS[k]
        base, cname = wave_creep(w)
        uid = f"w{w:03d}"
        wave_units[w] = (uid, cnt, k)
        hp = max(10, round(lane_hp(w) * HPSCALE / cnt * HPMAX))
        units.append(unit(base, uid, {
            "unam": f"{cname} ({nm.lower()}, хвиля {w})", "uhpm": hp, "udty": dty, "udef": de, "umvs": spd,
            "umvt": mv, "uabi": abil, "ubdi": 0, "ubba": 0, "ubsi": 0, "ufoo": 0,
            "uhpr": 0.0 if k != 6 else 1.0, **creep_attack(k, w)}))
        if w not in BOSS:
            units.append(unit(base, f"x{w:03d}", {
                "unam": f"Еліта: {cname} (хвиля {w})", "uhpm": hp * 3, "udty": dty, "udef": de + 3, "umvs": spd,
                "umvt": mv, "uabi": abil, "ubdi": 0, "ubba": 0, "ubsi": 0, "ufoo": 0,
                "uhpr": 0.0 if k != 6 else 1.0, **creep_attack(k, w)}))
    units.append(unit("nshe", "cour", {
        "unam": "Золота вівця", "uhpm": 60000, "umvs": 330, "uaen": 0, "ubdi": 0, "ubba": 0, "ufoo": 0, "udef": 2}))
    w3u = struct.pack("<i", 2) + struct.pack("<i", 0) + struct.pack("<i", len(units)) + b"".join(units)
    return w3u, builders, wave_units

def jass_data(builders, wave_units):
    L = ["function TD_InitData takes nothing returns nothing"]
    for (rc, slot, br), (code, a, b, c, d, _t) in EFFECTS.items():
        if code:
            tid = f"t{rc.lower()}{slot}{br.lower()}"
            L.append(f"    call SaveInteger(TD_H, '{tid}', 0, {code})")
            for i, v in enumerate((a, b, c, d), 1):
                L.append(f"    call SaveReal(TD_H, '{tid}', {i}, {float(v)})")
    for rc in ULT:
        code, a, b, c, d = ULT[rc][4]
        L.append(f"    call SaveInteger(TD_H, '{ult_id(rc)}', 0, {code})")
        for i, v in enumerate((a, b, c, d), 1):
            L.append(f"    call SaveReal(TD_H, '{ult_id(rc)}', {i}, {float(v)})")
        L.append(f"    call SaveInteger(TD_H, '{ult_id(rc)}', 5, 5)")
        L.append(f"    call SaveInteger(TD_H, '{ult_id(rc)}', 6, {ULT_COST})")
    for rc, *_r in RACES:
        for slot in range(1, 5):
            for li, (suf, upc, *_l) in enumerate(LEVELS):
                tid = f"t{rc.lower()}{slot}{suf.lower()}"
                L.append(f"    call SaveInteger(TD_H, '{tid}', 5, {slot})")
                L.append(f"    call SaveInteger(TD_H, '{tid}', 6, {round(SLOT_C[slot - 1] * upc)})")
    for w in range(1, WAVES + 1):
        cnt = wave_units[w][1]
        L.append(f"    set TD_WaveHpPer[{w}] = {lane_hp(w) * HPSCALE / cnt:.1f}")
    for h in range(len(HEROES)):
        for ri in range(len(RACES)):
            L.append(f"    set TD_HeroType[{(h + 1) * 10 + ri}] = '{hero_id(h, ri)}'")
        for j in range(4):
            L.append(f"    set TD_Skill[{(h + 1) * 4 + j}] = '{skill_id(h, j)}'")
    L.append(f"    set TD_HQType = '{HQ_ID}'")
    L.append(f"    set TD_DecoyType = '{DECOY_ID}'")
    L.append(f"    set TD_AbResearch = '{AB_RESEARCH}'")
    L.append(f"    set TD_AbGate = '{AB_GATE}'")
    L.append(f"    set TD_AbUp = '{AB_UP}'")
    L.append(f"    set TD_AbCall = '{AB_CALL}'")
    L.append(f"    set TD_AbContract = '{AB_CONTRACT}'")
    L.append(f"    set TD_AbEndless = '{AB_ENDLESS}'")
    L.append(f"    set TD_AbScout = '{AB_SCOUT}'")
    L.append(f"    set TD_AbHelp = '{AB_HELP}'")
    L.append(f"    set TD_GateType = '{GATE_ID}'")
    for b, row in enumerate(BS.B):
        (nm, lb, lsc, cls, ln, lhp, mn, mb, mcnt, mr, mhp, mech, per, pas, pk, pt, leak, say, tip) = row
        for t in range(3):
            L.append(f"    set TD_BsLead[{b * 3 + t}] = '{BS.lead_id(b, t)}'")
            L.append(f"    set TD_BsMin[{b * 3 + t}] = " + (f"'{BS.min_id(b, t)}'" if mcnt else "0"))
        L.append(f"    set TD_BsLeadN[{b}] = {ln}")
        L.append(f"    set TD_BsLeadHp[{b}] = {float(lhp)}")
        L.append(f"    set TD_BsMinN[{b}] = {mcnt}")
        L.append(f"    set TD_BsMinHp[{b}] = {float(mhp)}")
        L.append(f"    set TD_BsMech[{b}] = {mech}")
        L.append(f"    set TD_BsPer[{b}] = {float(per)}")
        L.append(f"    set TD_BsPas[{b}] = {pas}")
        L.append(f"    set TD_BsPers[{b}] = {pk}")
        L.append(f"    set TD_BsPType[{b}] = {pt}")
        L.append(f"    set TD_BsLeak[{b}] = {leak}")
        L.append(f'    set TD_BsSay[{b}] = "{say}"')
        L.append(f'    set TD_BsName[{b}] = "{nm}"')
        L.append(f'    set TD_BsTip[{b}] = "{tip}"')
    L.append(f"    set TD_BsCount = {len(BS.B)}")
    L.append("    set TD_ChCircle = 'ccir'")
    L.append("    set TD_ShopType = 'shop'")
    L.append("    set TD_CourierType = 'cour'")
    for ri, (rc, rname, *_r) in enumerate(RACES):
        L.append(f"    set TD_Reinforce[{ri}] = 't{rc.lower()}12'")
    for ri, (rc, rname, *_r) in enumerate(RACES):
        L.append(f'    set TD_RaceName[{ri}] = "{rname}"')
    for k, (nm, tip, *_k) in enumerate(KINDS):
        L.append(f'    set TD_KindName[{k}] = "{nm}"')
        L.append(f'    set TD_KindTip[{k}] = "{tip}"')
        L.append(f'    set TD_KindArmor[{k}] = "{ARMOR[k]}"')
    for w, (uid, cnt, k) in wave_units.items():
        L.append(f"    set TD_WaveUnit[{w}] = '{uid}'")
        L.append(f"    set TD_WaveCount[{w}] = {cnt}")
        L.append(f"    set TD_WaveKind[{w}] = {k}")
        if w not in BOSS:
            L.append(f"    set TD_EliteUnit[{w}] = 'x{w:03d}'")
        L.append(f'    set TD_WaveName[{w}] = "{wave_creep(w)[1]}"')
    L.append("endfunction")
    return "\n".join(L) + "\n"

# ---------- проверка JASS ----------
KEYWORDS = {"if", "elseif", "not", "and", "or", "return", "function", "takes", "returns", "loop", "exitwhen", "set", "call", "local"}
def check_jass(src):
    known = set()
    for f in ("common.j", "Blizzard.j"):
        t = open(os.path.join(GD, f), encoding="latin1").read()
        known |= set(re.findall(r"^\s*(?:constant\s+)?(?:native|function)\s+(\w+)", t, re.M))
        known |= set(re.findall(r"^\s*(?:constant\s+)?\w+\s+(?:array\s+)?(\w+)\s*=", t, re.M))
        known |= set(re.findall(r"^\s*type\s+(\w+)", t, re.M))
    errs, defined = [], set()
    nocomment = re.sub(r'"(?:[^"\\]|\\.)*"', '""', src)
    # Игра 1.26a не открывает лобби, если имя переменной/параметра совпадает с типом (pjass это пропускает)
    types = set()
    for f in ("common.j",):
        types |= set(re.findall(r"^\s*type\s+(\w+)", open(os.path.join(GD, f), encoding="latin1").read(), re.M))
    types |= {"integer", "real", "boolean", "string", "handle", "code", "nothing"}
    names = set(re.findall(r"local\s+\w+\s+(?:array\s+)?(\w+)", nocomment))
    for sig in re.findall(r"takes (.*?) returns", nocomment):
        if sig.strip() != "nothing":
            names |= {p.split()[1] for p in sig.split(",")}
    for n in sorted(names & types):
        errs.append(f"имя '{n}' совпадает с типом JASS: игра не откроет лобби")
    for i, line in enumerate(nocomment.splitlines(), 1):
        line = line.split("//")[0]
        m = re.match(r"\s*function\s+(\w+)", line)
        if m:
            defined.add(m.group(1)); continue
        for name in re.findall(r"\b([A-Za-z_]\w*)\s*\(", line):
            if name in KEYWORDS: continue
            if name not in known and name not in defined:
                errs.append(f"строка {i}: {name} не объявлена (или объявлена ниже)")
        for name in re.findall(r"function\s+(\w+)", line):
            if name not in known and name not in defined:
                errs.append(f"строка {i}: function {name} не объявлена выше")
        for s in re.findall(r'ExecuteFunc\(""\)', line):
            pass
    for rc in re.findall(r"'([^']*)'", nocomment):
        if len(rc) not in (1, 4):
            errs.append(f"rawcode '{rc}' не 4 символа")
    # баланс блоков
    for a, b in (("loop", "endloop"), ("if", "endif"), ("function", "endfunction")):
        na = len(re.findall(rf"^\s*{a}\b", nocomment, re.M)); nb = len(re.findall(rf"^\s*{b}\b", nocomment, re.M))
        if na != nb: errs.append(f"{a}: {na}, {b}: {nb}")
    return errs

# ---------- MPQ ----------
M = 0xFFFFFFFF
def _crypt_table():
    seed, t = 0x00100001, [0] * 0x500
    for i in range(256):
        idx = i
        for _ in range(5):
            seed = (seed * 125 + 3) % 0x2AAAAB; t1 = (seed & 0xFFFF) << 16
            seed = (seed * 125 + 3) % 0x2AAAAB; t2 = seed & 0xFFFF
            t[idx] = t1 | t2; idx += 256
    return t
CT = _crypt_table()
def mhash(s, typ):
    s1, s2 = 0x7FED7FED, 0xEEEEEEEE
    for ch in s.upper().replace("/", "\\"):
        v = ord(ch)
        s1 = CT[(typ << 8) + v] ^ ((s1 + s2) & M)
        s2 = (v + s1 + s2 + (s2 << 5) + 3) & M
    return s1
def encrypt(data, key):
    out, s2 = [], 0xEEEEEEEE
    for v in struct.unpack(f"<{len(data) // 4}I", data):
        s2 = (s2 + CT[0x400 + (key & 0xFF)]) & M
        out.append((v ^ (key + s2)) & M)
        key = ((((~key) << 0x15) + 0x11111111) & M) | (key >> 0x0B)
        s2 = (v + s2 + (s2 << 5) + 3) & M
    return struct.pack(f"<{len(out)}I", *out)

def read_template(path):
    raw = open(path, "rb").read()
    off = raw.find(b"MPQ\x1a")
    pre, mpq = raw[:off], raw[off:]
    tmp = path + ".tmp.mpq"
    open(tmp, "wb").write(mpq)
    a = mpyq.MPQArchive(tmp)
    files = {}
    for name in a.files:
        n = name.decode("latin1")
        if n in ("(attributes)", "(signature)", "(listfile)"):
            continue
        he = a.get_hash_table_entry(n)
        be = a.block_table[he.block_table_index]
        assert not (be.flags & 0x00010000), f"{n} зашифрован, шаблон не подходит"
        files[n] = ("raw", mpq[be.offset:be.offset + be.archived_size], be.size, be.flags)
    j = a.read_file("war3map.j")
    a.file.close()
    os.remove(tmp)
    return pre, files, j

def write_mpq(pre, files, out):
    names = sorted(files) + ["(listfile)"]
    files["(listfile)"] = ("data", "\r\n".join(sorted(files)).encode() + b"\r\n")
    body, blocks = b"", []
    for n in names:
        f = files[n]
        if f[0] == "raw":
            data, size, flags = f[1], f[2], f[3]
        else:
            data, size, flags = f[1], len(f[1]), 0x80000000
        blocks.append((32 + len(body), len(data), size, flags))
        body += data
    hsize = 1
    while hsize < len(names) * 2: hsize *= 2
    htab = [(M, M, 0xFFFF, 0xFFFF, M)] * hsize
    for bi, n in enumerate(names):
        p = mhash(n, 0) % hsize
        while htab[p][4] != M: p = (p + 1) % hsize
        htab[p] = (mhash(n, 1), mhash(n, 2), 0, 0, bi)
    hraw = b"".join(struct.pack("<IIHHI", *e) for e in htab)
    braw = b"".join(struct.pack("<IIII", *e) for e in blocks)
    hoff = 32 + len(body); boff = hoff + len(hraw)
    total = boff + len(braw)
    header = struct.pack("<4sIIHHIIII", b"MPQ\x1a", 32, total, 0, 3, hoff, boff, hsize, len(blocks))
    mpq = header + body + encrypt(hraw, mhash("(hash table)", 3)) + encrypt(braw, mhash("(block table)", 3))
    open(out, "wb").write(pre + mpq)

def pack_stormlib(tpl, out, newfiles):
    """Копирует шаблон и заменяет/добавляет файлы через официальную StormLib (zlib, как World Editor)."""
    import ctypes, shutil, tempfile
    from ctypes import wintypes
    shutil.copyfile(tpl, out)
    dll = ctypes.WinDLL(os.path.join(HERE, "tools", "StormLib.dll"), use_last_error=True)
    H = ctypes.c_void_p
    dll.SFileOpenArchive.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(H)]
    dll.SFileAddFileEx.argtypes = [H, wintypes.LPCWSTR, ctypes.c_char_p, wintypes.DWORD, wintypes.DWORD, wintypes.DWORD]
    dll.SFileCloseArchive.argtypes = [H]
    dll.SFileGetFileInfo.argtypes = [H, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD, ctypes.c_void_p]
    for f in (dll.SFileOpenArchive, dll.SFileAddFileEx, dll.SFileCloseArchive):
        f.restype = ctypes.c_bool
    h = H()
    if not dll.SFileOpenArchive(os.path.abspath(out), 0, 0, ctypes.byref(h)):
        sys.exit(f"StormLib не открыл {out}: {ctypes.get_last_error()}")
    tmpdir = tempfile.mkdtemp()
    try:
        for name, data in newfiles.items():
            p = os.path.join(tmpdir, name)
            open(p, "wb").write(data)
            # MPQ_FILE_COMPRESS | MPQ_FILE_REPLACEEXISTING, zlib
            if not dll.SFileAddFileEx(h, p, name.encode(), 0x00000200 | 0x80000000, 0x02, 0x02):
                sys.exit(f"StormLib не добавил {name}: {ctypes.get_last_error()}")
    finally:
        dll.SFileCloseArchive(h)

def main():
    tpl, out = sys.argv[1], sys.argv[2]
    w3u, builders, wave_units = build_objects()
    pre, files, j = read_template(tpl)
    j = j.decode("utf-8", "replace")
    if "TD_Init" in j:
        sys.exit("шаблон уже содержит TD: возьми чистый шаблон из World Editor")
    # шаблон из World Editor содержит триггер «Melee Initialization» (ратуша и рабочие): отключаем
    for line in ("call InitCustomTriggers(  )", "call RunInitializationTriggers(  )"):
        j = j.replace(line, "// отключено сборщиком: " + line)
    g = open(os.path.join(HERE, "td_globals.j"), encoding="utf-8").read()
    fns = jass_data(builders, wave_units) + "".join(
        open(os.path.join(HERE, f), encoding="utf-8").read() + "\n"
        for f in ("td_bonus.j", "td_effects.j", "td_heroes.j", "td_funcs.j"))
    j = j.replace("endglobals", g + "endglobals", 1)
    mi = j.index("function main takes nothing returns nothing")
    j = j[:mi] + fns + "\n" + j[mi:]
    mi = j.index("function main takes nothing returns nothing")
    ei = j.index("endfunction", mi)
    j = j[:ei] + "    call TD_Init()\n" + j[ei:]
    errs = check_jass(j)
    open(os.path.join(HERE, "war3map.j"), "w", encoding="utf-8").write(j)
    open(os.path.join(HERE, "war3map.w3u"), "wb").write(w3u)
    w3a = build_w3a()
    open(os.path.join(HERE, "war3map.w3a"), "wb").write(w3a)
    if errs:
        print("ОШИБКИ JASS:"); print("\n".join(errs[:40])); sys.exit(1)
    import subprocess
    import tempfile
    pjd = tempfile.mkdtemp(prefix="pjass_")
    for f in (os.path.join(HERE, "tools", "pjass.exe"), os.path.join(GD, "common.j"), os.path.join(GD, "Blizzard.j"), os.path.join(HERE, "war3map.j")):
        shutil.copy(f, pjd)
    r = subprocess.run([os.path.join(pjd, "pjass.exe"), "common.j", "Blizzard.j", "war3map.j"], cwd=pjd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-2000:]); sys.exit("pjass: ошибки JASS")
    pack_stormlib(tpl, out, {"war3map.j": j.encode("utf-8"), "war3map.w3u": w3u, "war3map.w3a": w3a})
    print(f"OK: {out}, об'єктів {w3u[8:12] and struct.unpack('<i', w3u[8:12])[0]}, war3map.j {len(j)} байт")

if __name__ == "__main__":
    main()
