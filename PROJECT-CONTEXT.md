---
Назва: Контекст проєкту islands-of-nonsense
Канон: selection_criteria/v10 та product_criteria/v10
Дата оновлення: 2026-11-23
---

# Islands of Nonsense (Castle Fight Web) — Project Context

## 0. AI Executive Summary & Navigation Index (Швидкий довідник для агентів)

> [!NOTE]
> Цей розділ є головним вказівником для автономних AI-агентів (LLM). Використовуйте його як Single Source of Truth для миттєвої навігації без потреби парсити весь детальний інженерний контекст.

| Параметр / Інваріант      | Значення                                                                     | Локація у коді / Примітка                                                             |
| :------------------------ | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Стек**                  | SvelteKit 3 + Svelte 5 (Runes) + TypeScript (`strict: true`) + PixiJS 8      | [package.json](package.json), [vite.config.ts](vite.config.ts)                        |
| **Хостинг та домен**      | `https://alik532ua.github.io/islands-of-nonsense/`                           | GitHub Pages (`adapter-static`), fallback `404.html`                                  |
| **Префікс сховища**       | `islandsofnonsense_` (dev: `islandsofnonsense-dev_`, legacy: `castlefight_`) | Суворий фасад у `src/lib/services/storage.ts`                                         |
| **Порт dev-сервера**      | **5174** (`--strictPort` для уникнення колізій із 5173/5197/5399)            | `package.json` dev script                                                             |
| **Маршрутизація та i18n** | 2 мови (`uk` типова, `en`), сувора заборона `ru`                             | `src/lib/i18n/index.ts`                                                               |
| **Захист CSP**            | `mode: 'hash'`, повна політика у `vite.config.ts`                            | `vite.config.ts`, `src/csp-hash.test.ts`                                              |
| **Безпека XSS & Storage** | Заборона сирого `{@html}` та неізольованого `localStorage`                   | `src/security.test.ts`                                                                |
| **Хмарна синхронізація**  | Firebase RTDB (кімнати, лобі, пошук `seek`, присутність, чат) + Auth         | [database.rules.json](database.rules.json), суворий `$other: false`, гейт інваріантів |
| **Error Boundary**        | `<svelte:boundary>` + `ErrorFallback.svelte`                                 | `src/routes/+layout.svelte`, `src/routes/+error.svelte`                               |
| **Тестування та гейти**   | 94 Vitest сьюти (540+ тестів) + Playwright E2E + Axe a11y                    | `npm test`, `npm run test:e2e`, `check:build`, `audit:ci`                             |
| **CI/CD Автоматизація**   | Deploy + Lighthouse CI + Bundle Budgets                                      | `.github/workflows/deploy.yml`, `lighthouse.yml`, `budgets.yml`                       |

### Швидкий покажчик ключових рішень:

- **Архітектура рендерингу**: Pixi.JS 8 WebGL/WebGPU рендерер (`ArenaRenderer.ts`) повністю відокремлений від симуляції (`simulation.ts`).
- **Оптимізація колізій та Boids-фізика**: Просторова хеш-сітка `SpatialHashGrid` (`spatialGrid.ts`) забезпечує пошук супротивників $O(1)$ на клітинку ($O(N)$ загалом замість $O(N^2)$) та Boids-розділення натовпу для формування лінії фронту.
- **Математика WC3**: Повна матриця взаємодії типів атак і броні з WC3 Castle Fight v37 (`damageMatrix.ts`), сплеш-урон артилерії та розрахунок броні за формулою демпфування.
- **Масштабованість фракцій**: Реєстр розширюваних рас `RaceRegistry` (`src/lib/engine/raceRegistry.ts`) для додавання нових фракцій, командирів та балансних тирів.
- **Детерміновані реплеї**: Серіалізатор дій матчу `ReplaySerializer` (`src/lib/engine/replaySerializer.ts`) з верифікацією контрольних сум для зберігання та шерінгу боїв.
- **Headless-турніри та баланс**: Автоматизований рушій `HeadlessBalanceRunner` (`src/lib/engine/balanceRunner.ts`) для симуляції сотень тіків між ботами без DOM за мілісекунди (`npm run test:balance`).
- **Тактичний бот-супротивник**: Автономний штучний інтелект `BotAI.ts` із динамічними ярусами цін (Tier 0..4), контр-піками типів броні, пріоритетом ППО проти літаючих юнітів та штрафом за дублікати будівель (-60 очок).
- **Безпека Firebase RTDB**: Повна фіксація схеми через `$other: false` на 11 критичних вузлах, валідація часових вікон серверного часу `now - 60000`, захист чату і присутності, 37 інваріантів у гейті `check:rules` та семантичний штамп `rules:stamp`.
- **Контроль розміру бандлу**: Скрипт `scripts/check-bundle.mjs` у воркфлоу `budgets.yml` (ліміт: 550 KB gzip JS з PixiJS та 60 KB CSS).

---

## 1. Загальні відомості

- **Назва**: Islands of Nonsense (WC3 Tactical Auto-Battler / Castle Fight Web)
- **Опис**: Браузерний порт легендарної карти Warcraft III _Castle Fight (v37 / 1.17)_. Гравці зводять будівлі на своїх базах, які автоматично спавнять війська. Війська марширують по верхній та нижній лініях, б'ються стінка на стінку та штурмують ворожий замок.
- **Стек**: SvelteKit 3 (`@sveltejs/kit`), Svelte 5 (виключно Runes: `$state`, `$derived`, `$props`), TypeScript (`strict: true`), Pixi.JS 8 (WebGL / WebGPU рендерер арени), Tailwind CSS v4 (`@tailwindcss/vite`), `@sveltejs/adapter-static`.
- **Хостинг**: GitHub Pages (`https://alik532ua.github.io/islands-of-nonsense/`).
- **Гілка деплою**: `main`.

---

## 2. Конфігурація адресації та базового шляху (SEO-v10 § 1.2)

- **SITE_ORIGIN**: `https://alik532ua.github.io`
- **SITE_BASE**: `/islands-of-nonsense` (у production-збірці; порожній рядок у локальній розробці)
- **paths.relative**: `false`
- **paths.origin**: `https://alik532ua.github.io`
- **Fallback**: `404.html` (налаштовано у `vite.config.ts`)
- **Порт dev-сервера**: **5174** (`--strictPort`)

---

## 3. Реєстр префіксів сховища (STORAGE-NAMESPACE-v10 § 1)

Сайт розміщено на спільному домені `alik532ua.github.io`. Для запобігання взаємного пошкодження та перекриття даних між проєктами всі операції з веб-сховищем підлягають обов'язковій ізоляції:

- **Префікс сховища**: `islandsofnonsense_` (раніше: `castlefight_`)
- **Префікс dev-середовища**: `islandsofnonsense-dev_`

| Поле                      | Значення                 |
| ------------------------- | ------------------------ |
| **PROJECT_PREFIX**        | `islandsofnonsense_`     |
| **STORAGE_PREFIX (prod)** | `islandsofnonsense_`     |
| **STORAGE_PREFIX (dev)**  | `islandsofnonsense-dev_` |

### Реєстр ключів сховища

| Ключ (без префікса)  | Повний ключ у сховищі                  | Призначення                   | Дозволені значення               |
| -------------------- | -------------------------------------- | ----------------------------- | -------------------------------- |
| `settings_volume`    | `islandsofnonsense_settings_volume`    | Загальна гучність аудіо       | Число від 0.0 до 1.0             |
| `settings_sound_fx`  | `islandsofnonsense_settings_sound_fx`  | Перемикач звукових ефектів    | `true` / `false`                 |
| `settings_lang`      | `islandsofnonsense_settings_lang`      | Мова інтерфейсу               | `'uk'` \| `'en'`                 |
| `settings_ui_scale`  | `islandsofnonsense_settings_ui_scale`  | Масштаб інтерфейсу            | `0.85` \| `1` \| `1.15` \| `1.3` |
| `selected_commander` | `islandsofnonsense_selected_commander` | Вибраний командир гравця      | `'sasha'\|'alik'\|'dima'...`     |
| `high_score`         | `islandsofnonsense_high_score`         | Максимальна кількість перемог | Ціле невід'ємне число            |
| `match_history`      | `islandsofnonsense_match_history`      | Останні 10 зіграних матчів    | JSON масив MatchSummary          |
| `stale_reload`       | `islandsofnonsense_stale_reload`       | Захист від циклу оновлення    | URL поточної сторінки            |

- Прямий виклик `window.localStorage` або `window.sessionStorage` заборонений поза фасадом `$lib/services/storage.ts` (контролюється `src/security.test.ts`).
- Метод `storage.clear()` видаляє тільки власні ключі префіксу.

---

## 4. Ігрова система, баланс та Acceptance Criteria (AC)

1. **Ізоляція ліній бою ([AC-LANE-1])**:
   - Арена масштабована (х3 масштаб) до 7200 x 2400 px із двома ізольованими коридорами: Верхня лінія (Y = 660) та Нижня лінія (Y = 1740).
   - Лінії розділені центральним скельним кряжем (Y = 1040..1360, висота 320 px) та центральною річкою на X = 3600 з кам'яними мостами.
   - Планувальна сітка: `GRID_STEP = 32px`, слід будівлі `CELL_SIZE = 64px` (2x2 підклітинки).
   - `SpatialHashGrid.findClosestEnemy` здійснює сувору фільтрацію за `u.lane === myLane`.

2. **Матриця шкоди та броні (Damage Matrix)**:

| Тип атаки \ Броня | Unarmored | Light | Medium | Heavy | Fortified | Hero | Divine |
| :---------------- | :-------: | :---: | :----: | :---: | :-------: | :--: | :----: |
| **Normal**        |   100%    | 150%  |  100%  | 100%  |    70%    | 100% |   5%   |
| **Pierce**        |   150%    | 200%  |  75%   | 100%  |    35%    | 50%  |   5%   |
| **Siege**         |   100%    | 100%  |  50%   | 125%  |   150%    | 50%  |   5%   |
| **Magic**         |   100%    | 125%  |  75%   | 200%  |    35%    | 50%  |   5%   |
| **Chaos**         |   100%    | 100%  |  100%  | 100%  |   100%    | 100% |  100%  |
| **Hero**          |   100%    | 100%  |  100%  | 100%  |    50%    | 100% |   5%   |

Формула зниження шкоди від броні:
$$DR = \frac{0.06 \times Armor}{1 + 0.06 \times |Armor|}$$

3. **Просторова оптимізація Boids та колізій (`SpatialHashGrid`)**:
   - Розмір комірки: 128 px.
   - Складність: перевірка колізій та пошук найближчої цілі знижено з $O(N^2)$ до $O(N)$ для 300+ юнітів на екрані.
   - Витрати пам'яті: < 2 МБ при піковому навантаженні (500 одночасних сутностей).

4. **Розширюваність рас та канонічний список 12 грабельних рас (`src/lib/engine/gameData.ts`, `src/lib/engine/raceRegistry.ts`)**:
   - **Єдине джерело істини (Single Source of Truth)**: `PLAYABLE_RACES` у `src/lib/engine/gameData.ts`:
     `Нежить`, `Орки`, `Демони`, `Техніки`, `Північ`, `Ельфи`, `Небожителі`, `Тролі`, `Елементалі`, `Тварини`, `Наги`, `Альянс`.
   - Застарілі довідникові назви (`Люди`, `Хаос`, `Порча`, `Нічні ельфи`, `Збирачі`) допускаються лише як зворотна сумісність при парсингу даних (`buildings.json` / `races.json`) через `formatRaceName`, і не повинні використовуватися як основні/видимі назви фракцій у новому коді та UI.
   - Модульна архітектура реєстрації кастомних фракцій через `RaceRegistry`.
   - Валідація економічних лімітів (Tiers 1-2, спеціальні споруди, легендарні білдинги з лімітом сиру `Golden Cheese`).

5. **Детерміновані реплеї (`src/lib/engine/replaySerializer.ts`)**:
   - Формат серіалізації дій гравців: таймштамп тіку, команда (`BUILD`, `UPGRADE`, `SELL`, `REPAIR`, `USE_ABILITY`), координати сітки.
   - Вбудована контрольна сума запобігає пошкодженню або ручній модифікації записів.

6. **Headless-тестування балансу (`src/lib/engine/balanceRunner.ts`)**:
   - Симуляція матчів у чистому TypeScript без ініціалізації DOM чи PixiJS.
   - Запуск 100+ тіків симуляції займає менше 100 мс у Vitest (`npm run test:balance`).

---

## 5. Безпека та CSP (SECURITY-v10 & CSP-v10)

- **Режим CSP**: `mode: 'hash'` у `vite.config.ts`.
- **Директиви CSP**:
  - `default-src: 'self'`
  - `script-src: 'self' + sha256 hashes`
  - `style-src: 'self' 'unsafe-inline'`
  - `font-src: 'self' data:`
  - `img-src: 'self' data: blob:`
  - `connect-src: 'self'`
  - `worker-src: 'self' blob:`
  - `object-src: 'none'`
  - `base-uri: 'self'`
  - `frame-ancestors: 'none'`
  - `form-action: 'none'`
- **Захист від XSS**: заборона сирого `{@html}` без санітизації (контролюється `src/security.test.ts`).
- **Перевірка залежностей**: `scripts/check-audit.mjs` у CI/CD.

---

## 6. Надійність та Error Boundaries (ERROR-HANDLING-v10)

- **Межа помилок (`<svelte:boundary>`)**:
  - Інтерфейс у `src/routes/+layout.svelte` обгорнутий у межу помилок із резервним компонентом `src/lib/components/ErrorFallback.svelte`.
- **Сторінка 404 / 500 (`src/routes/+error.svelte`)**:
  - Стилізований термінал із можливістю повернення в головне меню та скидання стану матчу.

---

## 7. Модель версіонування (VERSIONING-v10 § 1 & § 2)

- **Модель бампа**: «бамп на коміт» `scripts/bump-version.mjs` (піднімає patch-версію `+0.0.1` на чистому Node ESM без дочірніх процесів `npm`).
- **Синхронізація**: синхронізує `package.json`, `package-lock.json`, `static/app-version.json` та `src/lib/config/version.ts`.
- **Хуки**: `.husky/pre-commit` автоматично викликає тести, перевірку типів та бамп перед створенням коміту.

---

## 8. Політика перевірок та гейтів якості (CODE-QUALITY-v10)

| Команда                | Гейт canon.json    | Опис перевірки                                                                       |
| :--------------------- | :----------------- | :----------------------------------------------------------------------------------- |
| `npm run check`        | GATE-SVELTE-CHECK  | Сувора перевірка типізації TypeScript та синтаксису Svelte 5 Runes                   |
| `npm run lint`         | GATE-ESLINT        | Повний лінтинг ESLint Flat Config та форматування Prettier                           |
| `npm run format`       | —                  | Автоматичне форматування кодової бази                                                |
| `npm test`             | GATE-TEST-RUNNERS  | Vitest юніт-тести рушія, кузні, командирів, сітки та безпеки (94 файли, 540+ тестів) |
| `npm run test:balance` | GATE-BALANCE-SIM   | Headless прогін бот-турніру симуляції балансу без DOM                                |
| `npm run test:e2e`     | GATE-A11Y-AXE      | Playwright E2E автоматизовані браузерні тести та WCAG 2.2 AA аудит                   |
| `npm run check:build`  | GATE-BUILD-OUTPUT  | Автоматичний гейт зібраного проєкту (`build/index.html`, `build/404.html`)           |
| `npm run check:bundle` | GATE-BUNDLE-BUDGET | Контроль ваги бандлу JS (<550 KB gzip з PixiJS) та CSS (<60 KB gzip)                 |
| `npm run audit:ci`     | GATE-AUDIT         | Автоматичний аудит безпеки npm-пакетів                                               |
| `lhci autorun`         | GATE-LIGHTHOUSE    | Lighthouse CI аудит швидкодії, доступності (minScore: 0.9), SEO та кращих практик    |

### CI/CD Пайплайни GitHub Actions:

1. `.github/workflows/deploy.yml` — деплой на GitHub Pages після проходження гейтів якості.
2. `.github/workflows/lighthouse.yml` — окремий важкий аудит Lighthouse після завершення релізу.
3. `.github/workflows/budgets.yml` — контроль ваги бандлу на кожному pull request та пуші.

---

## 9. Доступність (a11y) та керування

- **Гарячі клавіші**:
  - `C` — відкрити / закрити вікно вибору Командира.
  - `F` — відкрити / закрити Військову Кузню.
  - `B` — відкрити / закрити Магазин Артефактів.
  - `E` — активувати Спасительний Удар Замку (Rescue Strike).
  - `R` — активувати Ультимативну здатність раси.
  - `Esc` — закрити активне модальне вікно або скасувати вибір.
- **Підтримка екранних читачів**:
  - Модальні вікна мають роль `dialog`, `aria-modal="true"`, доступні описи та заголовки.
  - Усі інтерактивні кнопки мають читабельні назви або `aria-label`.
- **Автоматизований аудит**:
  - E2E сьют `tests/a11y.spec.ts` з перевіркою `@axe-core/playwright` за стандартом WCAG 2.2 AA.

---

## 10. Опціональні критерії інженерного та продуктового пакетів

| Критерій              | Застосовано | Причина / Локація                                                                                                                                           |
| :-------------------- | :---------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I18N**              |     Так     | Двомовність UA/EN, `src/lib/i18n/index.ts`                                                                                                                  |
| **DEPENDENCIES**      |     Так     | Lockfile, `scripts/check-audit.mjs`                                                                                                                         |
| **VERSIONING**        |     Так     | `__APP_VERSION__`, `scripts/bump-version.mjs`, версія у футері                                                                                              |
| **ACCESSIBILITY**     |     Так     | WCAG 2.2 AA перевірки, гарячі клавіші, семантичні діалоги                                                                                                   |
| **STORAGE-NAMESPACE** |     Так     | Префікс `islandsofnonsense_`, `src/lib/services/storage.ts`                                                                                                 |
| **ERROR-HANDLING**    |     Так     | `<svelte:boundary>`, `ErrorFallback.svelte`                                                                                                                 |
| **PURE-SIMULATION**   |     Так     | Ізольований детермінований рушій `src/lib/engine/`                                                                                                          |
| **LIGHTHOUSE**        |     Так     | `lighthouserc.cjs` з мінімальним порогом 0.9                                                                                                                |
| **BUNDLE-BUDGET**     |     Так     | `scripts/check-bundle.mjs`, поріг 550 KB gzip                                                                                                               |
| **DEBUGGING**         |     Так     | logService (кільцевий буфер 1000, 200 у сесії), ServiceBadge, redact PII, ErrorLogModal, 55x V/R жести, hardReset/ownScope, 5 Vitest сьютів (DEBUGGING-v10) |

---

## 11. Прийняті рішення (Decisions)

| Питання                  | Обрано                                   | Причина                                                                        | Дата       |
| :----------------------- | :--------------------------------------- | :----------------------------------------------------------------------------- | :--------- |
| **Відокремлення Canvas** | Чистий клас `Simulation` без Pixi/DOM    | Можливість швидкого тестування логіки матчу та балансу у Vitest за мілісекунди | 2026-11-21 |
| **Оптимізація колізій**  | Просторова сітка `SpatialHashGrid`       | Зниження складності пошуку ворогів з $O(N^2)$ до $O(N)$ для 300+ юнітів        | 2026-11-21 |
| **Аудіо-ефекти**         | Web Audio API синтезатор замість mp3/wav | Мінімальний розмір репозиторію та нульовий час завантаження аудіобанків        | 2026-11-21 |
| **Режим CSP**            | `mode: 'hash'` у `vite.config.ts`        | Захист від XSS на статичному хостингу GitHub Pages                             | 2026-11-21 |
| **Контроль бандлу**      | Окремий воркфлоу `budgets.yml`           | Перевищення порогу ваги не перериває випуск термінових виправлень              | 2026-11-23 |

---

## 12. Свідомі відхилення від канону

1. **Рендерер Pixi.js на HTML5 Canvas**:
   - _Причина_: Для масштабних авто-батлерів зі сотнями юнітів на екрані DOM-рендеринг не забезпечує стабільні 60 FPS. Використано Pixi.js 8 із винесенням усіх інтерфейсних елементів керування у доступний HTML/DOM оверлей.
2. **Процедурний Web Audio синтез**:
   - _Причина_: Заощаджує понад 15 МБ трафіку та усуває зовнішні залежності від важких аудіо-файлів.
