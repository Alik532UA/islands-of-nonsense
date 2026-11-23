# Інструкція для AI-агентів: Castle Fight Web

Проєкт: **Castle Fight Web (WC3 Tactical Auto-Battler)**
Канон: **selection_criteria/v10 та product_criteria/v10**

Цей файл є обов'язковим для прочитання AI-агентами перед виконанням будь-яких завдань у репозиторії.
Також див. [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md) та каталог [.read_for_AI/](.read_for_AI/):

- [.read_for_AI/summary.md](.read_for_AI/summary.md) — короткий довідник кодової бази та модулів.
- [.read_for_AI/invariants.md](.read_for_AI/invariants.md) — обов'язкові інженерні інваріанти.

---

## 1. Загальна карта архітектури

```
src/
├── app.d.ts                     # Глобальні оголошення типів
├── app.html                     # HTML-каркас з CSP мета-тегами
├── security.test.ts             # Інваріанти безпеки (SECURITY-v10)
├── structure.test.ts            # Інваріанти структури репозиторію
├── csp-hash.test.ts             # Перевірка хешів інлайн-скриптів CSP
├── lib/
│   ├── assets/                  # SVG-іконки та статичні фавікони
│   ├── components/              # Svelte 5 UI-компоненти (TopBar, BottomBar, Modals, ErrorFallback)
│   ├── data/                    # JSON-дані юнітів, будівель, розрахунків з WC3
│   ├── engine/                  # Чистий рушій симуляції (Simulation, BotAI, SpatialGrid, Types)
│   ├── errors/                  # Доменні класи помилок
│   ├── i18n/                    # Двомовна система перекладів (uk, en)
│   ├── renderer/                # PixiJS рендерер арени (ArenaRenderer)
│   └── services/                # Ізольовані сервіси (Safe Storage facade, Procedural Audio)
└── routes/
    ├── +layout.svelte           # Головний лейаут
    ├── +page.svelte             # Головний екран гри, реактивні зв'язки та хоткеї
    └── layout.css               # Стилі Tailwind CSS v4
```

---

## 2. Суворі правила та конвенції для агентів

1. **Svelte 5 Runes**:
   - Використовувати виключно синтаксис Runes: `$state()`, `$derived()`, `$props()`, `$effect()`.
   - Жодних старих Svelte 4 `export let` або `writable/readable` сторів для нового коду.
2. **Типізація TypeScript**:
   - `strict: true`. Категорично заборонено використання `: any`. Використовуйте суворі інтерфейси або `unknown` із тайпгардами.
3. **Ізоляція веб-сховища (STORAGE-NAMESPACE-v10)**:
   - Спільний домен: `https://alik532ua.github.io`.
   - Заборонено прямий доступ до `window.localStorage` або `window.sessionStorage`.
   - Усі операції виконуються виключно через `storage` фасад із `$lib/services/storage.ts` з обов'язковим префіксом `castlefight_`.
4. **Безпека (SECURITY-v10)**:
   - Заборонено використання необробленого `{@html}` та викликів `document.write`.
   - Усі дії підтверджуються в `src/security.test.ts`.
5. **Мовна політика (LANGUAGE-POLICY-v10)**:
   - Тексти інтерфейсу ведуться українською мовою (`uk`) та англійською (`en`) через модуль `$lib/i18n`.
   - Сувора заборона російської мови в інтерфейсі, коментарях та конфігураціях.
6. **Ігрова симуляція (Headless Engine)**:
   - Рушій симуляції (`Simulation.ts`) є чистим TypeScript-класом і не повинен імпортувати модулі DOM чи PixiJS.
   - Рендерер (`ArenaRenderer.ts`) лише візуалізує стан, наданий `Simulation`.
7. **Автоматизація версіонування:**
   - Pre-commit хук Husky автоматично піднімає patch-версію `+0.0.1` через `scripts/bump-version.mjs` після проходження тестів та перевірки типів.

---

## 3. Команди перевірки якості

Агент зобов'язаний виконувати верифікацію після внесення змін:

```bash
# 1. Перевірка типізації Svelte 5 та TypeScript (має бути 0 помилок)
npm run check

# 2. Перевірка лінтером та форматуванням
npm run lint

# 3. Запуск усіх автоматичних тестів (симуляція, сітка, командири, безпека, структура)
npm run test

# 4. Перевірка збірки проекту
npm run check:build
```
