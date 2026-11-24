# Castle Fight Web — AI Quick Context Summary

## Quick Overview

- **Name**: Castle Fight Web (WC3 Tactical Auto-Battler)
- **Tech Stack**: SvelteKit 3, Svelte 5 Runes, TypeScript strict, Pixi.JS 8, Tailwind CSS v4.
- **Hosting**: GitHub Pages (`https://alik532ua.github.io/islands-of-nonsense/`) with adapter-static (`404.html` fallback).
- **Storage Prefix**: `islandsofnonsense_` (legacy: `castlefight_`; all storage calls go through `src/lib/services/storage.ts`).
- **Canonical Playable Races (12)**: `PLAYABLE_RACES` in `src/lib/engine/gameData.ts` (`Нежить`, `Орки`, `Демони`, `Техніки`, `Північ`, `Ельфи`, `Небожителі`, `Тролі`, `Елементалі`, `Тварини`, `Наги`, `Альянс`). Never hardcode old reference race lists (`Люди`, `Хаос`, `Порча`, `Нічні ельфи`, `Збирачі`) in UI or renderers.
- **Dev Port**: `5174` (`--strictPort`).
- **Languages**: `uk` (default) & `en`. Strict prohibition of Russian (`ru`).

## Key Code Locations

- Headless Simulation Engine: `src/lib/engine/simulation.ts`
- Spatial Grid Collider: `src/lib/engine/spatialGrid.ts`
- WC3 Damage & Armor Matrix: `src/lib/engine/damageMatrix.ts`
- Bot AI: `src/lib/engine/botAI.ts`
- Arena Renderer (Pixi.js): `src/lib/renderer/ArenaRenderer.ts`
- Storage Facade: `src/lib/services/storage.ts`
- Procedural Audio: `src/lib/services/audio.ts`
- Error Boundary: `src/lib/components/ErrorFallback.svelte`
