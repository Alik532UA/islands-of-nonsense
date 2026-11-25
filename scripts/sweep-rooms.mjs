/**
 * Realtime Database abandoned room and stale state cleaner script.
 * Executes scheduled cleanup against Firebase RTDB or Emulator REST endpoints.
 */
import { createSign } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execInEmulators, getEmulatorPorts } from './firebase-cli.mjs';

export const SWEEP_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
export const ABANDONED_ROOM_MAX_AGE_MS = 3 * 60 * 1000; // 3 minutes without online presence
export const DEFAULT_GAME_ID = 'castlefight';

function getLatestRoomActivity(room) {
	const info = room?.info;
	let latest = Math.max(
		info?.createdAt ?? 0,
		info?.updatedAt ?? 0,
		info?.startedAt ?? 0,
		info?.aliveAt ?? 0,
		info?.lastMoveAt ?? 0
	);
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
				latest = Math.max(latest, p.at ?? 0, p.lastSeen ?? 0);
			}
		}
	}
	return latest;
}

function hasOnlinePresence(room) {
	if (!room?.presence || typeof room.presence !== 'object') return false;
	return Object.values(room.presence).some((p) =>
		Boolean(p && typeof p === 'object' && p.online === true)
	);
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
			const ageMs = now - lastActivity;
			const online = hasOnlinePresence(room);
			const isOver = info.status === 'over';
			const isAbandoned = !online && ageMs > ABANDONED_ROOM_MAX_AGE_MS;

			if (isOver || isAbandoned || ageMs > SWEEP_MAX_AGE_MS) {
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
				const recordedAt = meta?.at ?? meta?.createdAt ?? 0;
				if (!survivingRooms.has(code) || (recordedAt > 0 && now - recordedAt > SWEEP_MAX_AGE_MS)) {
					pathsToDelete.add(`myRooms/${uid}/${code}`);
				}
			}
		}
	}

	return [...pathsToDelete];
}

function base64Url(input) {
	const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
	return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function fetchServiceAccountAccessToken(rawJson) {
	const sa = JSON.parse(rawJson);
	const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
	const nowSec = Math.floor(Date.now() / 1000);
	const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
	const claim = base64Url(
		JSON.stringify({
			iss: sa.client_email,
			scope:
				'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database',
			aud: tokenUri,
			iat: nowSec,
			exp: nowSec + 3600
		})
	);
	const signer = createSign('RSA-SHA256');
	signer.update(`${header}.${claim}`);
	const signature = base64Url(signer.sign(sa.private_key));
	const assertion = `${header}.${claim}.${signature}`;

	const res = await fetch(tokenUri, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(assertion)}`
	});
	if (!res.ok) {
		throw new Error(`OAuth2 token request failed (${res.status}): ${await res.text()}`);
	}
	const body = await res.json();
	if (!body?.access_token) {
		throw new Error('OAuth2 token response missing access_token');
	}
	return body.access_token;
}

async function getTargetConfig() {
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
	if (process.env.FIREBASE_SERVICE_ACCOUNT) {
		const accessToken = await fetchServiceAccountAccessToken(process.env.FIREBASE_SERVICE_ACCOUNT);
		return {
			baseUrl: dbUrl.replace(/\/$/, ''),
			query: '',
			bearer: accessToken
		};
	}
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
	const target = await getTargetConfig();
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
