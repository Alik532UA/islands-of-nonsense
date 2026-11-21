# Castle Fight Web — Інструкції розробки

Детальний контекст проекту дивіться у [PROJECT-CONTEXT.md](./PROJECT-CONTEXT.md) та [AGENTS.md](./AGENTS.md).

## Команди для терміналу

```bash
# Розробка
npm run dev

# Перевірка типів
npm run check

# Перевірка стилю коду
npm run lint

# Форматування
npm run format

# Запуск тестів
npm run test
```

## Основні правила

- Використовувати Svelte 5 Runes (`$state`, `$derived`, `$props`).
- Не використовувати `: any`.
- Доступ до `localStorage` виключно через `$lib/services/storage.ts` з префіксом `castlefight_`.
