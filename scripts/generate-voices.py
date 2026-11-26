#!/usr/bin/env python3
"""
Generate static MP3 voice lines for all 12 workers and 144 units using edge-tts.
Uses voice, pitch, and rate profiles from src/lib/data/voiceLines.json.
"""

import argparse
import asyncio
import json
from pathlib import Path
import sys

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICE_LINES_PATH = ROOT / "src" / "lib" / "data" / "voiceLines.json"
OUT_WORKERS_DIR = ROOT / "static" / "audio" / "voices" / "workers"
OUT_UNITS_DIR = ROOT / "static" / "audio" / "voices" / "units"


async def generate_one(
    sem: asyncio.Semaphore,
    text: str,
    voice: str,
    pitch: str,
    rate: str,
    out_path: Path,
    force: bool,
) -> tuple[str, bool, str]:
    if not force and out_path.exists() and out_path.stat().st_size > 0:
        return (out_path.name, True, "cached")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    async with sem:
        for attempt in range(3):
            try:
                comm = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate)
                await comm.save(str(out_path))
                if out_path.exists() and out_path.stat().st_size > 0:
                    return (out_path.name, True, "generated")
            except Exception as exc:
                if attempt == 2:
                    return (out_path.name, False, str(exc))
                await asyncio.sleep(0.8 * (attempt + 1))
    return (out_path.name, False, "empty output")


async def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Edge TTS voice lines")
    parser.add_argument("--force", action="store_true", help="Regenerate existing files")
    parser.add_argument("--concurrency", type=int, default=6, help="Max parallel TTS requests")
    args = parser.parse_args()

    data = json.loads(VOICE_LINES_PATH.read_text(encoding="utf-8"))
    sem = asyncio.Semaphore(args.concurrency)
    tasks = []

    for race_name, entry in data.get("workers", {}).items():
        slug = entry["slug"]
        texts = entry.get("texts") or ([entry["text"]] if "text" in entry else [])
        for idx, text in enumerate(texts, start=1):
            out_path = OUT_WORKERS_DIR / f"{slug}_{idx}.mp3"
            tasks.append(
                generate_one(
                    sem,
                    text,
                    entry["voice"],
                    entry["pitch"],
                    entry["rate"],
                    out_path,
                    args.force,
                )
            )

    for unit_id, entry in data.get("units", {}).items():
        texts = entry.get("texts") or ([entry["text"]] if "text" in entry else [])
        for idx, text in enumerate(texts, start=1):
            out_path = OUT_UNITS_DIR / f"{unit_id}_{idx}.mp3"
            tasks.append(
                generate_one(
                    sem,
                    text,
                    entry["voice"],
                    entry["pitch"],
                    entry["rate"],
                    out_path,
                    args.force,
                )
            )

    print(f"Generating {len(tasks)} voice files (concurrency={args.concurrency})...")
    results = await asyncio.gather(*tasks)

    generated = sum(1 for _, ok, status in results if ok and status == "generated")
    cached = sum(1 for _, ok, status in results if ok and status == "cached")
    failed = [(name, status) for name, ok, status in results if not ok]

    print(f"Done: {generated} generated, {cached} cached, {len(failed)} failed.")
    if failed:
        for name, err in failed:
            print(f"  FAILED {name}: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
