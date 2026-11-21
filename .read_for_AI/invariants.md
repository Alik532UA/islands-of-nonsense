# Castle Fight Web — Invariants & Quality Gates

## Critical Invariants

1. **Svelte 5 Runes Only**: Strictly use `$state()`, `$derived()`, `$props()`. No legacy stores.
2. **Lane Isolation ([AC-LANE-1])**: Units on top lane cannot target or attack units on bottom lane and vice versa under any circumstance.
3. **Simulation Headless Isolation**: `simulation.ts` must never import Pixi.js or DOM classes. Pure mathematical model.
4. **Storage Isolation**: Never touch `window.localStorage` directly. Only use `$lib/services/storage.ts`.
5. **Content Security Policy**: Inline scripts must match sha256 hashes generated from `src/app.html`.
6. **No Raw Unvetted HTML**: Never use `{@html}` without vetting.
7. **Accessibility (WCAG 2.2 AA)**: All modal dialogs must use `role="dialog"`, have `aria-modal="true"`, accessible names and handle `Escape` key.
