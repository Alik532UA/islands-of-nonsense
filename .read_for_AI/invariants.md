# Castle Fight Web — Invariants & Quality Gates

## Critical Invariants

1. **Svelte 5 Runes Only**: Strictly use `$state()`, `$derived()`, `$props()`. No legacy stores.
2. **Lane Isolation ([AC-LANE-1])**: Units on top lane cannot target or attack units on bottom lane and vice versa under any circumstance.
3. **Simulation Headless Isolation**: `simulation.ts` must never import Pixi.js or DOM classes. Pure mathematical model.
4. **Storage Isolation**: Never touch `window.localStorage` directly. Only use `$lib/services/storage.ts`.
5. **Content Security Policy**: Inline scripts must match sha256 hashes generated from `src/app.html`.
6. **No Raw Unvetted HTML**: Never use `{@html}` without vetting.
7. **Accessibility (WCAG 2.2 AA)**: All modal dialogs must use `role="dialog"`, have `aria-modal="true"`, accessible names and handle `Escape` key.
8. **Canonical 12 Playable Races (Single Source of Truth)**: Always rely on `PLAYABLE_RACES` in `src/lib/engine/gameData.ts` (`Нежить`, `Орки`, `Демони`, `Техніки`, `Північ`, `Ельфи`, `Небожителі`, `Тролі`, `Елементалі`, `Тварини`, `Наги`, `Альянс`). Legacy reference names (`Люди`, `Хаос`, `Порча`, `Нічні ельфи`, `Збирачі`) exist only as data-mapping aliases via `formatRaceName` and must not be hardcoded as primary races in UI, renderers, or new game logic.
