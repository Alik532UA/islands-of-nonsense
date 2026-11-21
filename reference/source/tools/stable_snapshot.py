# Утверждение РАБОЧЕЙ версии карты: проверка теста, локальная копия в versions\stable и коммит+тег в приватном репозитории GitHub.
# Запуск (из любой папки):
#   python -X utf8 tools\stable_snapshot.py <cf|cf-ua|bvo|ltd> <путь.w3x> <версия> --log <Logs\...txt> --note "что нового" [--src] [--no-push] [--force]
# Версия считается рабочей только если в логе теста есть строка FINISH (иначе отказ; --force только по явному решению владельца).
# --src обновляет в ветке исходники и скрипты сборки (src\...), чтобы коммит версии содержал рабочие скрипты именно этой версии.
import os, sys, re, shutil, json, hashlib, argparse, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import git_publish as G

KEYS = {
    'cf': ('castle-fight', 'maps/CastleFight_RU.w3x', 'cf-v{v}', 'Castle Fight v{v} (RU)'),
    'cf-ua': ('castle-fight', 'maps/CastleFight_UA.w3x', 'cf-v{v}-ua', 'Castle Fight v{v} (UA)'),
    'bvo': ('bleach-bvo', 'maps/BvO14_Ascension.w3x', 'bvo-v{v}', 'BvO 14.0 Ascension v{v}'),
    'ltd': ('legion-td', 'maps/LTDx20_NG4.1.4.w3x', 'ltd-{v}', 'Legion TD x20 NG 4.1.4 {v}'),
}
SRC = {
    'castle-fight': [('castle-fight', 'src/castle-fight'), ('tasks/2026-11-18-cf-ukr', 'src/tasks/2026-11-18-cf-ukr'),
                     ('tasks/2026-11-19-cf-items-race', 'src/tasks/2026-11-19-cf-items-race'), ('tasks/2026-11-19-cf-commanders', 'src/tasks/2026-11-19-cf-commanders')],
    'bleach-bvo': [('bleach-op', 'src/bleach-op'), ('tasks/2026-11-18-bleach-op', 'src/tasks/2026-11-18-bleach-op'),
                   ('tasks/2026-11-19-bvo-feedback', 'src/tasks/2026-11-19-bvo-feedback'), ('tasks/2026-11-19-friends-heroes', 'src/tasks/2026-11-19-friends-heroes')],
    'legion-td': [('legion-td', 'src/legion-td'), ('tasks/2026-11-18-ltd-rebuild', 'src/tasks/2026-11-18-ltd-rebuild')],
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('key', choices=list(KEYS))
    ap.add_argument('w3x')
    ap.add_argument('version')
    ap.add_argument('--log', default='')
    ap.add_argument('--note', default='')
    ap.add_argument('--src', action='store_true')
    ap.add_argument('--no-push', action='store_true')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    branch, dest, tagf, msgf = KEYS[a.key]
    if not os.path.isfile(a.w3x):
        sys.exit('нет файла карты: ' + a.w3x)
    finish = ''
    if a.log and os.path.isfile(a.log):
        for ln in open(a.log, encoding='utf-8', errors='replace'):
            if 'FINISH' in ln:
                finish = ln.strip()
    if not finish and not a.force:
        sys.exit('ОТКАЗ: в логе теста нет строки FINISH, версия не считается рабочей. Прогони автотест, затем повтори.')
    tag = tagf.format(v=a.version)
    wt = os.path.join(G.WT, branch)
    if not os.path.isdir(wt):
        sys.exit('нет рабочего дерева ветки: ' + wt + ' (сначала tools\\git_publish.py)')
    if tag in G.run(['tag'], G.REPO).split():
        sys.exit('тег уже есть: ' + tag + ' (версию не перезаписываем, возьми новый номер)')
    # локальная копия «точно рабочих»
    sha = hashlib.sha256(open(a.w3x, 'rb').read()).hexdigest()
    loc = os.path.join(G.ROOT, 'versions', 'stable', a.key, a.version)
    os.makedirs(loc, exist_ok=True)
    shutil.copy2(a.w3x, os.path.join(loc, os.path.basename(a.w3x)))
    json.dump({'key': a.key, 'version': a.version, 'file': os.path.basename(a.w3x), 'sha256': sha, 'date': datetime.datetime.now().isoformat(timespec='seconds'),
               'note': a.note, 'test_finish_line': finish, 'forced': bool(a.force and not finish)}, open(os.path.join(loc, 'manifest.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    # ветка: файл карты (+ исходники), коммит, тег
    q = os.path.join(wt, dest)
    os.makedirs(os.path.dirname(q), exist_ok=True)
    shutil.copy2(a.w3x, q)
    if a.src:
        for s_rel, d_rel in SRC.get(branch, []):
            sp = os.path.join(G.ROOT, *s_rel.split('/'))
            dp = os.path.join(wt, *d_rel.split('/'))
            if os.path.isdir(sp):
                G.copy_filtered(sp, dp)   # накладываем поверх, ничего не стираем (старые версии файлов остаются в истории git)
    msg = msgf.format(v=a.version) + (': ' + a.note if a.note else '') + ('\n\nТест: ' + finish if finish else '\n\nБЕЗ подтверждающего теста (--force)')
    G.commit_all(wt, msg)
    G.run(['tag', tag], wt)
    print('утверждено:', tag, '| локально:', loc)
    if not a.no_push:
        G.run(['push', 'origin', branch], wt)
        G.run(['push', 'origin', tag], wt)
        print('отправлено в приватный репозиторий <приватный-репозиторий>, ветка', branch)


main()
