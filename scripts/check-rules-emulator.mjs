import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execInEmulators, getEmulatorPorts } from './firebase-cli.mjs';
import { RULES_STAMP } from './check-rules-stamp-helper.mjs';

const PROJECT = process.env.FIREBASE_EMULATOR_PROJECT || 'demo-islands-of-nonsense';
const RTDB_NS = `${PROJECT}-default-rtdb`;

export const EMULATOR_RULE_CASES = [
	// __rulesVersion
	{ id: 'rulesVersion-valid-read', allow: true },
	{ id: 'rulesVersion-stale-read', allow: false },
	{ id: 'rulesVersion-client-write', allow: false },
	// rooms root & info
	{ id: 'rooms-list-read', allow: false },
	{ id: 'rooms-create-valid', allow: true },
	{ id: 'rooms-create-invalid-code', allow: false },
	{ id: 'rooms-info-extra-field', allow: false },
	{ id: 'rooms-info-overwrite-with-members', allow: false },
	{ id: 'rooms-info-immutable-gameId', allow: false },
	{ id: 'rooms-info-immutable-createdAt', allow: false },
	{ id: 'rooms-info-seed-locked-playing', allow: false },
	{ id: 'rooms-info-takeLead-handover', allow: true },
	{ id: 'rooms-info-takeLead-nonmember', allow: false },
	// members
	{ id: 'members-join-valid', allow: true },
	{ id: 'members-anon-spoof-account', allow: false },
	{ id: 'members-immutable-order', allow: false },
	{ id: 'members-extra-field', allow: false },
	// moves
	{ id: 'moves-nonmember-read', allow: false },
	{ id: 'moves-member-read', allow: true },
	{ id: 'moves-append-valid', allow: true },
	{ id: 'moves-overwrite-existing', allow: false },
	{ id: 'moves-cooldown-too-fast', allow: false },
	{ id: 'moves-future-clientTime', allow: false },
	{ id: 'moves-extra-payload-field', allow: false },
	{ id: 'moves-restart-nonhost-wipe', allow: false },
	{ id: 'moves-restart-host-wipe', allow: true },
	// presence & chat
	{ id: 'presence-member-write', allow: true },
	{ id: 'presence-nonmember-write', allow: false },
	{ id: 'chat-member-write', allow: true },
	{ id: 'chat-spam-cooldown', allow: false },
	{ id: 'chat-too-long', allow: false },
	{ id: 'chat-forged-sender', allow: false },
	// lobby & seek bounded queries
	{ id: 'lobby-bounded-read', allow: true },
	{ id: 'lobby-unbounded-read', allow: false },
	{ id: 'lobby-oversize-limit-read', allow: false },
	{ id: 'lobby-host-publish', allow: true },
	{ id: 'lobby-stranger-overwrite', allow: false },
	{ id: 'seek-bounded-read', allow: true },
	{ id: 'seek-unbounded-read', allow: false },
	{ id: 'seek-owner-write', allow: true },
	{ id: 'seek-other-impersonate', allow: false },
	// users, handles, leaders, myRooms
	{ id: 'handles-anon-deny', allow: false },
	{ id: 'handles-claim-valid', allow: true },
	{ id: 'handles-steal-existing', allow: false },
	{ id: 'profile-anon-deny', allow: false },
	{ id: 'profile-valid-write', allow: true },
	{ id: 'profile-handle-mismatch', allow: false },
	{ id: 'play-negative-score', allow: false },
	{ id: 'play-valid-score', allow: true },
	{ id: 'leaders-unbounded-read', allow: false },
	{ id: 'leaders-bounded-read', allow: true },
	{ id: 'leaders-score-inflate-deny', allow: false },
	{ id: 'leaders-valid-publish', allow: true },
	{ id: 'myRooms-owner-write', allow: true },
	{ id: 'myRooms-other-read-deny', allow: false },
	{ id: 'myRooms-extra-field-deny', allow: false }
];

function authBaseUrl() {
	const raw = process.env.FIREBASE_AUTH_EMULATOR_HOST || `127.0.0.1:${getEmulatorPorts().auth}`;
	const host = raw.startsWith('http') ? raw : `http://${raw}`;
	return `${host}/identitytoolkit.googleapis.com/v1`;
}

function rtdbBaseUrl() {
	const raw =
		process.env.FIREBASE_DATABASE_EMULATOR_HOST || `127.0.0.1:${getEmulatorPorts().database}`;
	return raw.startsWith('http') ? raw : `http://${raw}`;
}

async function signUpAnonymous() {
	const res = await fetch(`${authBaseUrl()}/accounts:signUp?key=fake-api-key`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ returnSecureToken: true })
	});
	if (!res.ok) throw new Error(`Anonymous signUp failed: ${res.status} ${await res.text()}`);
	return res.json();
}

async function signUpEmail(email, password = 'StrongPassword123!') {
	const res = await fetch(`${authBaseUrl()}/accounts:signUp?key=fake-api-key`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password, returnSecureToken: true })
	});
	if (!res.ok) throw new Error(`Email signUp failed: ${res.status} ${await res.text()}`);
	return res.json();
}

async function rtdbRequest(method, path, { auth, body, query = '' } = {}) {
	const sep = query ? `&${query}` : '';
	const authParam = auth ? `auth=${encodeURIComponent(auth)}&` : '';
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const url = `${rtdbBaseUrl()}${normalizedPath}.json?${authParam}ns=${encodeURIComponent(RTDB_NS)}${sep}`;
	const res = await fetch(url, {
		method,
		headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined
	});
	return { status: res.status, ok: res.ok, body: await res.text() };
}

async function assertAllowed(id, promise) {
	const res = await promise;
	if (!res.ok) {
		throw new Error(`Expected ALLOW [${id}], got HTTP ${res.status}: ${res.body}`);
	}
}

async function assertDenied(id, promise) {
	const res = await promise;
	if (res.status !== 401 && res.status !== 403) {
		throw new Error(`Expected DENY (401/403) [${id}], got HTTP ${res.status}: ${res.body}`);
	}
}

async function runSuite() {
	const results = [];
	const record = async (id, allow, fn) => {
		if (allow) await assertAllowed(id, fn());
		else await assertDenied(id, fn());
		results.push(id);
	};

	// Reset emulator RTDB cleanly using emulator secret
	await rtdbRequest('PUT', '/', { auth: 'owner', body: null });

	const host = await signUpEmail(`host_${Date.now()}@example.com`);
	const peer = await signUpEmail(`peer_${Date.now()}@example.com`);
	const outsider = await signUpEmail(`outsider_${Date.now()}@example.com`);
	const anon = await signUpAnonymous();

	const hostUid = host.localId;
	const peerUid = peer.localId;
	const anonUid = anon.localId;

	// 1. __rulesVersion
	await record('rulesVersion-valid-read', true, () =>
		rtdbRequest('GET', `/__rulesVersion/${RULES_STAMP}`, { auth: host.idToken })
	);
	await record('rulesVersion-stale-read', false, () =>
		rtdbRequest('GET', '/__rulesVersion/deadbeef0000', { auth: host.idToken })
	);
	await record('rulesVersion-client-write', false, () =>
		rtdbRequest('PUT', `/__rulesVersion/${RULES_STAMP}`, { auth: host.idToken, body: true })
	);

	// 2. rooms list & info
	await record('rooms-list-read', false, () =>
		rtdbRequest('GET', '/rooms', { auth: host.idToken })
	);

	const validRoomInfo = {
		gameId: 'islands-of-nonsense',
		rulesVersion: 1,
		seed: 123456,
		hostUid,
		status: 'lobby',
		listed: true,
		createdAt: { '.sv': 'timestamp' },
		config: { modeId: 'classic', teamSize: 1, targetWins: 3 }
	};

	await record('rooms-create-invalid-code', false, () =>
		rtdbRequest('PUT', '/rooms/bad_code/info', { auth: host.idToken, body: validRoomInfo })
	);
	await record('rooms-info-extra-field', false, () =>
		rtdbRequest('PUT', '/rooms/AB12CD/info', {
			auth: host.idToken,
			body: { ...validRoomInfo, hacked: true }
		})
	);
	await record('rooms-create-valid', true, () =>
		rtdbRequest('PUT', '/rooms/AB12CD/info', { auth: host.idToken, body: validRoomInfo })
	);

	// 3. members
	await record('members-anon-spoof-account', false, () =>
		rtdbRequest('PUT', `/rooms/AB12CD/members/${anonUid}`, {
			auth: anon.idToken,
			body: {
				name: 'AnonHero',
				role: 'player',
				team: 'west',
				slot: 1,
				order: 1,
				account: true
			}
		})
	);
	await record('members-extra-field', false, () =>
		rtdbRequest('PUT', `/rooms/AB12CD/members/${hostUid}`, {
			auth: host.idToken,
			body: {
				name: 'Host',
				role: 'player',
				team: 'west',
				slot: 1,
				order: 1,
				extra: 'nope'
			}
		})
	);
	await record('members-join-valid', true, () =>
		rtdbRequest('PUT', `/rooms/AB12CD/members/${hostUid}`, {
			auth: host.idToken,
			body: {
				name: 'Host',
				role: 'player',
				team: 'west',
				slot: 1,
				order: 1,
				account: true
			}
		})
	);
	await assertAllowed(
		'members-peer-join',
		rtdbRequest('PUT', `/rooms/AB12CD/members/${peerUid}`, {
			auth: peer.idToken,
			body: {
				name: 'Peer',
				role: 'player',
				team: 'east',
				slot: 2,
				order: 2
			}
		})
	);

	await record('members-immutable-order', false, () =>
		rtdbRequest('PUT', `/rooms/AB12CD/members/${peerUid}/order`, {
			auth: peer.idToken,
			body: 5
		})
	);

	// Now that members exist, outsider cannot overwrite /info, nor can host mutate gameId/createdAt
	await record('rooms-info-overwrite-with-members', false, () =>
		rtdbRequest('PUT', '/rooms/AB12CD/info', { auth: outsider.idToken, body: validRoomInfo })
	);
	await record('rooms-info-immutable-gameId', false, () =>
		rtdbRequest('PUT', '/rooms/AB12CD/info/gameId', {
			auth: host.idToken,
			body: 'other-game'
		})
	);
	await record('rooms-info-immutable-createdAt', false, () =>
		rtdbRequest('PUT', '/rooms/AB12CD/info/createdAt', {
			auth: host.idToken,
			body: 999
		})
	);

	// 4. lobby & seek while room is listed in lobby state
	const lobbyBody = {
		code: 'AB12CD',
		hostUid,
		hostName: 'Host',
		hostCountry: 'UA',
		gameId: 'islands-of-nonsense',
		rulesVersion: 1,
		players: 2,
		maxPlayers: 2,
		modeId: 'classic',
		createdAt: { '.sv': 'timestamp' }
	};
	await record('lobby-host-publish', true, () =>
		rtdbRequest('PUT', '/lobby/islands-of-nonsense/AB12CD', { auth: host.idToken, body: lobbyBody })
	);
	await record('lobby-stranger-overwrite', false, () =>
		rtdbRequest('PUT', '/lobby/islands-of-nonsense/AB12CD', { auth: outsider.idToken, body: null })
	);
	await record('lobby-unbounded-read', false, () =>
		rtdbRequest('GET', '/lobby/islands-of-nonsense', { auth: outsider.idToken })
	);
	await record('lobby-oversize-limit-read', false, () =>
		rtdbRequest('GET', '/lobby/islands-of-nonsense', {
			auth: outsider.idToken,
			query: 'orderBy=%22createdAt%22&limitToLast=31'
		})
	);
	await record('lobby-bounded-read', true, () =>
		rtdbRequest('GET', '/lobby/islands-of-nonsense', {
			auth: outsider.idToken,
			query: 'orderBy=%22createdAt%22&limitToLast=30'
		})
	);

	await record('seek-other-impersonate', false, () =>
		rtdbRequest('PUT', `/seek/islands-of-nonsense/${hostUid}`, {
			auth: outsider.idToken,
			body: { uid: hostUid, name: 'Fake', at: { '.sv': 'timestamp' } }
		})
	);
	await record('seek-owner-write', true, () =>
		rtdbRequest('PUT', `/seek/islands-of-nonsense/${hostUid}`, {
			auth: host.idToken,
			body: { uid: hostUid, name: 'Host', country: 'UA', at: { '.sv': 'timestamp' } }
		})
	);
	await record('seek-unbounded-read', false, () =>
		rtdbRequest('GET', '/seek/islands-of-nonsense', { auth: peer.idToken })
	);
	await record('seek-bounded-read', true, () =>
		rtdbRequest('GET', '/seek/islands-of-nonsense', {
			auth: peer.idToken,
			query: 'orderBy=%22at%22&limitToLast=30'
		})
	);

	// 5. Transition room to playing (with valid roster) and test moves, seed lock, wipe, handover
	await assertAllowed(
		'rooms-set-playing',
		rtdbRequest('PATCH', '/rooms/AB12CD/info', {
			auth: host.idToken,
			body: {
				status: 'playing',
				startedAt: { '.sv': 'timestamp' },
				roster: {
					[hostUid]: { name: 'Host', seat: 0, team: 'west', race: 'human' },
					[peerUid]: { name: 'Peer', seat: 1, team: 'east', race: 'orc' }
				}
			}
		})
	);

	await record('moves-nonmember-read', false, () =>
		rtdbRequest('GET', '/rooms/AB12CD/moves', { auth: outsider.idToken })
	);
	await record('moves-member-read', true, () =>
		rtdbRequest('GET', '/rooms/AB12CD/moves', { auth: peer.idToken })
	);

	await record('moves-future-clientTime', false, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: host.idToken,
			body: {
				'moves/000001': {
					seq: 1,
					by: hostUid,
					type: 'BUILD',
					at: { '.sv': 'timestamp' },
					payload: {
						tick: 10,
						team: 'west',
						buildingType: 'h000',
						x: 5,
						y: 5,
						clientTime: Date.now() + 60_000
					}
				},
				[`members/${hostUid}/lastMoveAt`]: { '.sv': 'timestamp' }
			}
		})
	);
	await record('moves-extra-payload-field', false, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: host.idToken,
			body: {
				'moves/000001': {
					seq: 1,
					by: hostUid,
					type: 'BUILD',
					at: { '.sv': 'timestamp' },
					payload: { tick: 10, team: 'west', cheatGold: 9999 }
				},
				[`members/${hostUid}/lastMoveAt`]: { '.sv': 'timestamp' }
			}
		})
	);
	await record('moves-append-valid', true, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: host.idToken,
			body: {
				'moves/000001': {
					seq: 1,
					by: hostUid,
					type: 'BUILD',
					at: { '.sv': 'timestamp' },
					payload: { tick: 10, team: 'west', buildingType: 'h000', x: 5, y: 5, playerSlot: 1 }
				},
				[`members/${hostUid}/lastMoveAt`]: { '.sv': 'timestamp' }
			}
		})
	);
	await record('moves-overwrite-existing', false, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: host.idToken,
			body: {
				'moves/000001': {
					seq: 1,
					by: hostUid,
					type: 'SURRENDER',
					at: { '.sv': 'timestamp' },
					payload: { tick: 10, team: 'west' }
				},
				[`members/${hostUid}/lastMoveAt`]: { '.sv': 'timestamp' }
			}
		})
	);
	await record('moves-cooldown-too-fast', false, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: host.idToken,
			body: {
				'moves/000002': {
					seq: 2,
					by: hostUid,
					type: 'PAUSE',
					at: { '.sv': 'timestamp' },
					payload: { tick: 11, team: 'west' }
				},
				[`members/${hostUid}/lastMoveAt`]: { '.sv': 'timestamp' }
			}
		})
	);
	await record('rooms-info-seed-locked-playing', false, () =>
		rtdbRequest('PUT', '/rooms/AB12CD/info/seed', { auth: host.idToken, body: 999999 })
	);

	// 6. presence & handover & wipe
	await record('presence-member-write', true, () =>
		rtdbRequest('PUT', `/rooms/AB12CD/presence/${peerUid}`, {
			auth: peer.idToken,
			body: { online: true, lastSeen: { '.sv': 'timestamp' } }
		})
	);
	await record('presence-nonmember-write', false, () =>
		rtdbRequest('PUT', `/rooms/AB12CD/presence/${outsider.localId}`, {
			auth: outsider.idToken,
			body: { online: true, lastSeen: { '.sv': 'timestamp' } }
		})
	);

	await record('moves-restart-nonhost-wipe', false, () =>
		rtdbRequest('PUT', '/rooms/AB12CD/moves', { auth: peer.idToken, body: null })
	);
	await record('moves-restart-host-wipe', true, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: host.idToken,
			body: {
				moves: null,
				'info/seed': 654321
			}
		})
	);

	await record('rooms-info-takeLead-nonmember', false, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: outsider.idToken,
			body: {
				'info/hostUid': outsider.localId,
				'info/leadSeq': '000001',
				'moves/000001': {
					seq: 1,
					by: outsider.localId,
					type: 'lead',
					at: { '.sv': 'timestamp' },
					payload: { from: hostUid }
				}
			}
		})
	);
	await record('rooms-info-takeLead-handover', true, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: peer.idToken,
			body: {
				'info/hostUid': peerUid,
				'info/leadSeq': '000001',
				'moves/000001': {
					seq: 1,
					by: peerUid,
					type: 'lead',
					at: { '.sv': 'timestamp' },
					payload: { from: hostUid }
				}
			}
		})
	);

	// 7. chat
	await record('chat-forged-sender', false, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: peer.idToken,
			body: {
				'chat/msg1': {
					senderUid: hostUid,
					senderName: 'Peer',
					text: 'hi',
					at: { '.sv': 'timestamp' }
				},
				[`members/${peerUid}/lastChatAt`]: { '.sv': 'timestamp' }
			}
		})
	);
	await record('chat-too-long', false, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: peer.idToken,
			body: {
				'chat/msg1': {
					senderUid: peerUid,
					senderName: 'Peer',
					text: 'a'.repeat(201),
					at: { '.sv': 'timestamp' }
				},
				[`members/${peerUid}/lastChatAt`]: { '.sv': 'timestamp' }
			}
		})
	);
	await record('chat-member-write', true, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: peer.idToken,
			body: {
				'chat/msg1': {
					senderUid: peerUid,
					senderName: 'Peer',
					text: 'gl hf!',
					at: { '.sv': 'timestamp' }
				},
				[`members/${peerUid}/lastChatAt`]: { '.sv': 'timestamp' }
			}
		})
	);
	await record('chat-spam-cooldown', false, () =>
		rtdbRequest('PATCH', '/rooms/AB12CD', {
			auth: peer.idToken,
			body: {
				'chat/msg2': {
					senderUid: peerUid,
					senderName: 'Peer',
					text: 'spam',
					at: { '.sv': 'timestamp' }
				},
				[`members/${peerUid}/lastChatAt`]: { '.sv': 'timestamp' }
			}
		})
	);

	// 8. handles, profile, play, leaders, myRooms
	await record('handles-anon-deny', false, () =>
		rtdbRequest('PUT', '/handles/anon_name', { auth: anon.idToken, body: anonUid })
	);
	await record('handles-claim-valid', true, () =>
		rtdbRequest('PUT', '/handles/host_player', { auth: host.idToken, body: hostUid })
	);
	await record('profile-anon-deny', false, () =>
		rtdbRequest('PUT', `/users/${anonUid}/profile`, {
			auth: anon.idToken,
			body: { handle: 'anon_name', name: 'Anon' }
		})
	);
	await record('profile-valid-write', true, () =>
		rtdbRequest('PUT', `/users/${hostUid}/profile`, {
			auth: host.idToken,
			body: { handle: 'host_player', name: 'HostPlayer', country: 'UA' }
		})
	);
	await record('handles-steal-existing', false, () =>
		rtdbRequest('PUT', '/handles/host_player', { auth: outsider.idToken, body: outsider.localId })
	);
	await record('profile-handle-mismatch', false, () =>
		rtdbRequest('PUT', `/users/${outsider.localId}/profile`, {
			auth: outsider.idToken,
			body: { handle: 'host_player', name: 'Outsider' }
		})
	);

	await record('play-negative-score', false, () =>
		rtdbRequest('PUT', `/users/${hostUid}/play`, {
			auth: host.idToken,
			body: { score: -5, games: {} }
		})
	);
	await record('play-valid-score', true, () =>
		rtdbRequest('PUT', `/users/${hostUid}/play`, {
			auth: host.idToken,
			body: { score: 1500, games: { 'islands-of-nonsense': { wins: 3, losses: 1, score: 1500 } } }
		})
	);
	await record('leaders-score-inflate-deny', false, () =>
		rtdbRequest('PUT', `/leaders/${hostUid}`, {
			auth: host.idToken,
			body: { name: 'HostPlayer', handle: 'host_player', score: 999999 }
		})
	);
	await record('leaders-valid-publish', true, () =>
		rtdbRequest('PUT', `/leaders/${hostUid}`, {
			auth: host.idToken,
			body: { name: 'HostPlayer', handle: 'host_player', score: 1500 }
		})
	);
	await record('leaders-unbounded-read', false, () =>
		rtdbRequest('GET', '/leaders', { auth: outsider.idToken })
	);
	await record('leaders-bounded-read', true, () =>
		rtdbRequest('GET', '/leaders', {
			auth: outsider.idToken,
			query: 'orderBy=%22score%22&limitToLast=50'
		})
	);

	await record('myRooms-owner-write', true, () =>
		rtdbRequest('PUT', `/myRooms/${hostUid}/AB12CD`, {
			auth: host.idToken,
			body: { at: { '.sv': 'timestamp' } }
		})
	);
	await record('myRooms-other-read-deny', false, () =>
		rtdbRequest('GET', `/myRooms/${hostUid}`, { auth: outsider.idToken })
	);
	await record('myRooms-extra-field-deny', false, () =>
		rtdbRequest('PUT', `/myRooms/${hostUid}/AB12CD`, {
			auth: host.idToken,
			body: { at: { '.sv': 'timestamp' }, admin: true }
		})
	);

	const expected = EMULATOR_RULE_CASES.map((c) => c.id);
	const missing = expected.filter((id) => !results.includes(id));
	if (missing.length > 0) {
		throw new Error(`Missing emulator rule checks: ${missing.join(', ')}`);
	}
	console.log(
		`✅ Firebase RTDB + Auth Emulator rules suite passed (${results.length} real checks).`
	);
}

const isEntrypoint =
	Boolean(process.argv[1]) &&
	resolve(process.argv[1]).toLowerCase() === resolve(fileURLToPath(import.meta.url)).toLowerCase();

if (isEntrypoint) {
	if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
		runSuite().catch((err) => {
			console.error('❌ Firebase Emulator rules suite failed:', err);
			process.exit(1);
		});
	} else {
		execInEmulators('database,auth', 'node scripts/check-rules-emulator.mjs', {
			project: PROJECT
		}).catch((err) => {
			console.error('❌ Failed to run Firebase Emulator rules suite:', err);
			process.exit(1);
		});
	}
}
