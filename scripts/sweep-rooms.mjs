/**
 * Realtime Database abandoned room and stale state cleaner script.
 * Executes scheduled cleanup against Firebase RTDB or Emulator REST endpoints.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execInEmulators, getEmulatorPorts } from './firebase-cli.mjs';

export const SWEEP_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
export const DEFAULT_GAME_ID = 'islands-of-nonsense';

function getLatestRoomActivity(room) {
	const info = room?.info;
	let latest = Math.max(info?.createdAt ?? 0, info?.updatedAt ?? 0, info?.lastMoveAt ?? 0);
	if (room?.members && typeof room.members === 'object') {
		for (const member of Object.values(room.members)) {
			if (member && typeof member === 'object') {
				latest = Math.max(latest, member.lastMoveAt ?? 0, member.joinedAt ?? 0);
			}
		}
	}
	if (room?.presence && typeof room.presence === 'object') {
		for (const p of Object.values(room.presence)) {
			if (p && typeof p === 'object') {
				latest = Math.max(latest, p.at ?? 0);
			}
		}
	}
	return latest;
}

export function planRoomSweep(roomsSnapshot, now = Date.now(), extras = {}) {
	const pathsToDelete = new Set();
	const defaultGameId = extras.gameId || DEFAULT_GAME_ID;
	const survivingRooms = new Set();

	if (roomsSnapshot && typeof roomsSnapshot === 'object') {
		for (const [code, room] of Object.entries(roomsSnapshot)) {
			if (!room || typeof room !== 'object') {
				pathsToDelete.add(`rooms/${code}`);
				continue;
			}
			const info = room.info;
			if (!info || typeof info.createdAt !== 'number') {
				pathsToDelete.add(`rooms/${code}`);
				continue;
			}

			const gameId = info.gameId || defaultGameId;
			const lastActivity = getLatestRoomActivity(room);
			if (now - lastActivity > SWEEP_MAX_AGE_MS) {
				pathsToDelete.add(`rooms/${code}`);
				pathsToDelete.add(`lobby/${gameId}/${code}`);
			} else {
				survivingRooms.add(code);
			}
		}
	}

	if (extras.lobbyByGame && typeof extras.lobbyByGame === 'object') {
		for (const [gameId, entries] of Object.entries(extras.lobbyByGame)) {
			if (!entries || typeof entries !== 'object') continue;
			for (const [code, item] of Object.entries(entries)) {
				const createdAt = item?.createdAt ?? 0;
				if (!survivingRooms.has(code) || !createdAt || now - createdAt > SWEEP_MAX_AGE_MS) {
					pathsToDelete.add(`lobby/${gameId}/${code}`);
				}
			}
		}
	}

	if (extras.seekByGame && typeof extras.seekByGame === 'object') {
		for (const [gameId, entries] of Object.entries(extras.seekByGame)) {
			if (!entries || typeof entries !== 'object') continue;
			for (const [uid, item] of Object.entries(entries)) {
				const at = item?.at ?? 0;
				if (!at || now - at > SWEEP_MAX_AGE_MS) {
					pathsToDelete.add(`seek/${gameId}/${uid}`);
				}
			}
		}
	}

	if (extras.myRooms && typeof extras.myRooms === 'object') {
		for (const [uid, rooms] of Object.entries(extras.myRooms)) {
			if (!rooms || typeof rooms !== 'object') continue;
			for (const [code, meta] of Object.entries(rooms)) {
				const createdAt = meta?.createdAt ?? 0;
				if (!survivingRooms.has(code) || (createdAt > 0 && now - createdAt > SWEEP_MAX_AGE_MS)) {
					pathsToDelete.add(`myRooms/${uid}/${code}`);
				}
			}
		}
	}

	return [...pathsToDelete];
}

function getTargetConfig() {
	if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
		const raw = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
		const base = raw.startsWith('http') ? raw : `http://${raw}`;
		const project = process.env.FIREBASE_EMULATOR_PROJECT || 'demo-islands-of-nonsense';
		return {
			baseUrl: base,
			query: `ns=${encodeURIComponent(`${project}-default-rtdb`)}`,
			bearer: 'owner'
		};
	}
	const dbUrl =
		process.env.FIREBASE_DATABASE_URL ||
		'https://islands-of-nonsense-default-rtdb.europe-west1.firebasedatabase.app';
	const token = process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_TOKEN || '';
	return {
		baseUrl: dbUrl.replace(/\/$/, ''),
		query: token ? `auth=${encodeURIComponent(token)}` : '',
		bearer: ''
	};
}

async function fetchJson(target, path) {
	const q = target.query ? `?${target.query}` : '';
	const headers = target.bearer ? { Authorization: `Bearer ${target.bearer}` } : undefined;
	const res = await fetch(`${target.baseUrl}/${path}.json${q}`, { headers });
	if (!res.ok) {
		throw new Error(`RTDB GET /${path} failed with ${res.status}: ${await res.text()}`);
	}
	return res.json();
}

async function applyMultiPathDeletes(target, paths) {
	if (paths.length === 0) return;
	const patch = {};
	for (const p of paths) {
		patch[p] = null;
	}
	const q = target.query ? `?${target.query}` : '';
	const headers = {
		'Content-Type': 'application/json',
		...(target.bearer ? { Authorization: `Bearer ${target.bearer}` } : {})
	};
	const res = await fetch(`${target.baseUrl}/.json${q}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(patch)
	});
	if (!res.ok) {
		throw new Error(`RTDB PATCH sweep failed with ${res.status}: ${await res.text()}`);
	}
}

export async function runSweep({ apply = false } = {}) {
	const target = getTargetConfig();
	const [rooms, lobbyByGame, seekByGame, myRooms] = await Promise.all([
		fetchJson(target, 'rooms'),
		fetchJson(target, 'lobby'),
		fetchJson(target, 'seek'),
		fetchJson(target, 'myRooms')
	]);
	const toDelete = planRoomSweep(rooms, Date.now(), { lobbyByGame, seekByGame, myRooms });
	if (apply && toDelete.length > 0) {
		await applyMultiPathDeletes(target, toDelete);
	}
	console.log(
		`${apply ? '🧹 Applied' : '🧪 Dry-run'} room sweep: ${toDelete.length} stale path(s) planned.`
	);
	return toDelete;
}

const isEntrypoint =
	Boolean(process.argv[1]) &&
	resolve(process.argv[1]).toLowerCase() === resolve(fileURLToPath(import.meta.url)).toLowerCase();

if (isEntrypoint) {
	const args = new Set(process.argv.slice(2));
	const apply = args.has('--apply');
	const useEmulator = args.has('--emulator');

	if (useEmulator && !process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
		const cmd = apply ? 'node scripts/sweep-rooms.mjs --apply' : 'node scripts/sweep-rooms.mjs';
		execInEmulators('database', cmd, {
			project: process.env.FIREBASE_EMULATOR_PROJECT || 'demo-islands-of-nonsense',
			env: { FORCE_SWEEP_PORT: String(getEmulatorPorts().database) }
		}).catch((err) => {
			console.error('❌ Emulator sweep failed:', err);
			process.exit(1);
		});
	} else {
		runSweep({ apply }).catch((err) => {
			console.error('❌ Room sweep failed:', err);
			process.exit(1);
		});
	}
}
