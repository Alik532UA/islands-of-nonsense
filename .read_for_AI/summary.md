# Castle Fight Web — AI Quick Context Summary

## Quick Overview

- **Name**: Castle Fight Web (WC3 Tactical Auto-Battler)
- **Tech Stack**: SvelteKit, Svelte 5 Runes, TypeScript strict, Pixi.JS 8, Tailwind CSS v4.
- **Hosting**: GitHub Pages (`https://alik532ua.github.io/islands-of-nonsense/`) with adapter-static (`404.html` fallback).
- **Storage Prefix**: `islandsofnonsense_` (legacy: `castlefight_`; all storage calls go through `src/lib/services/storage.ts`).
- **Canonical Playable Races (12)**: `PLAYABLE_RACES` in `src/lib/engine/gameData.ts` (`Нежить`, `Орки`, `Демони`, `Техніки`, `Північ`, `Ельфи`, `Небожителі`, `Тролі`, `Елементалі`, `Тварини`, `Наги`, `Альянс`). Never hardcode old reference race lists (`Люди`, `Хаос`, `Порча`, `Нічні ельфи`, `Збирачі`) in UI or renderers.
- **Dev Port**: `5174` (`--strictPort`).
- **Languages**: `uk` (default) & `en`. Strict prohibition of Russian (`ru`).

## Key Code Locations

- Headless Simulation Engine: `src/lib/engine/simulation.ts`
- Spatial Grid Collider: `src/lib/engine/spatialGrid.ts` (cellSize = 80 px)
- WC3 Damage & Armor Matrix: `src/lib/engine/damageMatrix.ts`
- Race Registry & Replay Serialization: `src/lib/engine/raceRegistry.ts`, `src/lib/engine/replaySerializer.ts`
- Bot AI: `src/lib/engine/botAI.ts`
- Arena Renderer (Pixi.js): `src/lib/renderer/ArenaRenderer.ts`
- Online Transport, Lobby & Matchmaking: `src/lib/net/firebase.ts`, `src/lib/net/roomNet.ts`, `src/lib/net/seek.ts`, `src/lib/components/online/OnlineRoomHUD.svelte`
- Firebase RTDB Rules & Invariants Gate: `database.rules.json`, `scripts/check-rules.mjs` (41 invariants), `scripts/rules-stamp.mjs`
- Storage Facade: `src/lib/services/storage.ts`
- Procedural Audio: `src/lib/services/audio.ts`
- Error Boundary: `src/lib/components/ErrorFallback.svelte`
