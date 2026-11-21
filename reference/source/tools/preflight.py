# Проверка перед сборкой и тестом карт Castle Fight (за секунды, без игры). Ловит повторяющиеся ошибки 2026-11-19:
#  1) синтаксис Python-скриптов сборки (heredoc портил строки);
#  2) PowerShell-скрипты с кириллицей без BOM (PS 5.1 ломает кавычки);
#  3) локальные имена и параметры JASS, совпадающие с именами оригинальной карты (сборка падает через 40 с);
#  4) метки логов //CMDLOG_*, //SPLOG_*, //RSJ_INIT без очистки в релизе или без замены в тестах;
#  5) русские строки для игрока в моём JASS, которых нет в украинском словаре (в UA останется русский текст);
#  6) пустые ветки теста: слишком много веток elseif в CF_TestTick не проверить без сборки, поэтому только предупреждение по числу шагов в steps.
# Запуск: python -X utf8 tools\preflight.py   (код выхода 1, если есть FAIL). Опции: --ps чтобы проверить ещё и .ps1 во всех папках проекта.
import os, re, sys, py_compile

ROOT = r'D:\Создание карты Warcraft'
CF = os.path.join(ROOT, 'castle-fight')
UA = os.path.join(ROOT, 'tasks', '2026-11-18-cf-ukr')
PY = ['build_cf.py', 'race_sbor.py', 'race_sbor_jass.py', 'bot_ai.py', 'skills_jass.py', 'analyze.py']
res = {'OK': [], 'WARN': [], 'FAIL': []}


def add(kind, msg):
    res[kind].append(msg)


# 1) синтаксис
for f in PY:
    p = os.path.join(CF, f)
    if not os.path.exists(p):
        continue
    try:
        compile(open(p, encoding='utf-8').read(), p, 'exec')   # ничего не пишет на диск
        add('OK', f'синтаксис {f}')
    except SyntaxError as e:
        add('FAIL', f'синтаксис {f}: строка {e.lineno}: {e.msg}')

# 2) PowerShell без BOM
cyr = re.compile('[А-Яа-яЁё]')
dirs = [CF, os.path.join(ROOT, 'tools')] + ([os.path.join(ROOT, 'bleach-op')] if '--ps' in sys.argv else [])
for d in dirs:
    for f in os.listdir(d):
        if f.endswith('.ps1'):
            b = open(os.path.join(d, f), 'rb').read()
            code = '\n'.join(x for x in b.decode('utf-8', 'ignore').split('\n') if not x.lstrip().startswith('#'))
            if cyr.search(code) and not b.startswith(b'\xef\xbb\xbf'):
                add('FAIL', f'{f}: кириллица вне комментариев и нет BOM (сохранить как utf-8-sig)')
if not any('BOM' in m for m in res['FAIL']):
    add('OK', 'PowerShell-скрипты с кириллицей имеют BOM')

# 3) имена JASS против имён оригинальной карты
orig = open(os.path.join(CF, 'orig_war3map.j'), encoding='utf-8', errors='replace').read()
names = set(re.findall(r'^function (\w+) takes', orig, re.M))
m = re.search(r'^globals\n(.*?)^endglobals', orig, re.M | re.S)
if m:
    for ln in m.group(1).split('\n'):
        ln = ln.split('=')[0].strip()
        if ln and not ln.startswith('//'):
            names.add(ln.split()[-1])
bad = {}
for f in ('build_cf.py', 'race_sbor_jass.py', 'skills_jass.py'):   # bot_ai.py пропускаем: build_cf.py сам добавляет cf_ коротким именам бота
    p = os.path.join(CF, f)
    if not os.path.exists(p):
        continue
    t = open(p, encoding='utf-8').read()
    for mm in re.finditer(r'\blocal\s+(?:integer|real|unit|group|string|boolean|trigger|timer|force|location|rect|effect|player|dialog|button|hashtable|item|destructable|widget|texttag|lightning|sound|multiboard)\s+(?:array\s+)?(\w+)', t):
        nm = mm.group(1)
        if nm in names and not nm.startswith('cf_'):
            bad.setdefault(nm, set()).add(f)
    for mm in re.finditer(r'\bfunction\s+(CF_\w+)\s+takes\s+([^\n]*?)\s+returns', t):
        for par in re.findall(r'\b(?:integer|real|unit|group|string|boolean|player|trigger|timer)\s+(\w+)', mm.group(2)):
            if par in names and not par.startswith('cf_'):
                bad.setdefault(par, set()).add(f + ' (параметр ' + mm.group(1) + ')')
if bad:
    for nm, fs in sorted(bad.items()):
        add('FAIL', f'имя JASS «{nm}» совпадает с именем карты ({", ".join(sorted(fs))}): добавить префикс cf_')
else:
    add('OK', f'локальные имена и параметры JASS не совпадают с именами карты (сверено с {len(names)} именами)')

# 4) метки логов
src = ''
for f in ('build_cf.py', 'race_sbor_jass.py'):
    src += open(os.path.join(CF, f), encoding='utf-8').read() + '\n'
marks = sorted(set(re.findall(r'^//([A-Z][A-Z0-9_]{3,})\s*$', src, re.M)) | set(re.findall(r"'//([A-Z][A-Z0-9_]{3,})'", src)))
for mk in marks:
    reps = len(re.findall(r"replace\('//" + re.escape(mk) + r"'", src))
    if mk.startswith(('CMDLOG', 'SPLOG')) and reps < 2:
        add('FAIL', f'метка //{mk}: замен {reps}, нужно минимум 2 (тест и очистка релиза)')
    elif reps < 1:
        add('FAIL', f'метка //{mk}: нет ни одной замены, в скрипт попадёт комментарий вместо кода')
if marks and not any('метка' in m for m in res['FAIL']):
    add('OK', f'метки логов {len(marks)} шт. имеют замену в тесте и очистку в релизе')

# 5) русские строки игрока без украинского перевода
ua_text = ''
for p in (os.path.join(UA, '_new_ua.py'), os.path.join(CF, 'race_sbor_ua.json'), os.path.join(UA, 'out', 'strings.tsv')):
    if os.path.exists(p):
        ua_text += open(p, encoding='utf-8').read()
miss = set()
for f in ('build_cf.py', 'race_sbor_jass.py'):
    for ln in open(os.path.join(CF, f), encoding='utf-8').read().split('\n'):
        if re.search(r'DisplayTimedText|DialogAddButton|DialogSetMessage|return "', ln) and cyr.search(ln) and 'Preload' not in ln and 'CF_Log' not in ln:
            for lit in re.findall(r'"([^"\n]*[А-Яа-яЁё][^"\n]*)"', ln):
                key = lit.replace('\\', '')
                if key and key not in ua_text and lit not in ua_text:
                    miss.add(lit[:70])
if miss:
    for lit in sorted(miss)[:12]:
        add('WARN', f'нет украинского перевода (проверить _new_ua.py): «{lit}»')
else:
    add('OK', 'русские строки игрока в моём JASS имеют перевод')

# 6) ожидание: шаги теста
t = open(os.path.join(CF, 'build_cf.py'), encoding='utf-8').read()
if 'DoNothing()' in t and "s == 'call DoNothing()'" not in t:
    add('WARN', 'пустые шаги теста снова получают ветки: функция CF_TestTick со 160 ветками роняла игру при загрузке')

order = ['FAIL', 'WARN', 'OK']
for k in order:
    for msg in res[k]:
        print(f'[{k}] {msg}')
print(f'ИТОГ: FAIL {len(res["FAIL"])}, WARN {len(res["WARN"])}, OK {len(res["OK"])}')
sys.exit(1 if res['FAIL'] else 0)
