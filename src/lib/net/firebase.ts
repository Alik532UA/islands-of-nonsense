import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';
import { logService } from '$lib/services/logService.svelte';
import { rememberSession } from '$lib/services/accountFlag';
import {
	EMULATOR,
	EMULATOR_COMMAND,
	EMULATOR_HOST,
	EMULATOR_PORTS,
	EMULATOR_PROJECT
} from './emulator';

/**
 * Lazy, anonymous Firebase RTDB & Auth connection.
 * Dynamic imports prevent inflating base bundle size.
 */

const CONFIG = {
	apiKey: 'AIzaSyAGPJH2zgOcKwgSYPSrfWrQN0HHELi_XLI',
	authDomain: 'islands-of-nonsense.firebaseapp.com',
	databaseURL: 'https://islands-of-nonsense-default-rtdb.europe-west1.firebasedatabase.app',
	projectId: 'islands-of-nonsense',
	storageBucket: 'islands-of-nonsense.firebasestorage.app',
	messagingSenderId: '473794906278',
	appId: '1:473794906278:web:50dda3aec697a2159e0c67'
};

const EMULATOR_CONFIG = {
	apiKey: 'demo-key',
	authDomain: `${EMULATOR_PROJECT}.firebaseapp.com`,
	projectId: EMULATOR_PROJECT,
	databaseURL: `http://${EMULATOR_HOST}:${EMULATOR_PORTS.database}?ns=${EMULATOR_PROJECT}-default-rtdb`
};

const EMULATOR_WAIT_MS = 1500;

async function emulatorUp(): Promise<void> {
	if (typeof fetch === 'undefined') return;
	try {
		await fetch(`http://${EMULATOR_HOST}:${EMULATOR_PORTS.database}/.json`, {
			mode: 'no-cors',
			signal: AbortSignal.timeout(EMULATOR_WAIT_MS)
		});
	} catch (error) {
		throw new Error(`Firebase emulator is not running (${EMULATOR_COMMAND})`, { cause: error });
	}
}

export interface Connection {
	uid: string;
	db: Database;
	auth: Auth;
}

let pending: Promise<Connection> | null = null;
let emulatorsWired = false;
let serverOffset = 0;
let off: (() => void) | null = null;
let offsetArrived: Promise<void> = Promise.resolve();

export const OFFSET_WAIT_MS = 3000;

export function serverNow(): number {
	return Date.now() + serverOffset;
}

export async function serverTime(): Promise<number> {
	await connect();
	let timer: ReturnType<typeof setTimeout> | undefined;
	await Promise.race([
		offsetArrived,
		new Promise<void>((resolve) => (timer = setTimeout(resolve, OFFSET_WAIT_MS)))
	]);
	clearTimeout(timer);
	return serverNow();
}

export function connect(): Promise<Connection> {
	pending ??= open().catch((error: unknown) => {
		pending = null;
		logService.warn('network', 'sign-in failed', { reason: String(error) });
		throw error;
	});
	return pending;
}

async function open(): Promise<Connection> {
	if (EMULATOR) await emulatorUp();
	const [{ initializeApp, getApps, getApp }, authModule, dbModule] = await Promise.all([
		import('firebase/app'),
		import('firebase/auth'),
		import('firebase/database')
	]);

	const existingApp = getApps().length > 0;
	const app = existingApp ? getApp() : initializeApp(EMULATOR ? EMULATOR_CONFIG : CONFIG);
	const auth: Auth =
		existingApp || !EMULATOR
			? authModule.getAuth(app)
			: authModule.initializeAuth(app, {
					persistence: authModule.browserSessionPersistence,
					popupRedirectResolver: authModule.browserPopupRedirectResolver
				});

	const db = dbModule.getDatabase(app);
	if (EMULATOR && !emulatorsWired) {
		authModule.connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
			disableWarnings: true
		});
		dbModule.connectDatabaseEmulator(db, EMULATOR_HOST, EMULATOR_PORTS.database);
		emulatorsWired = true;
	}

	await auth.authStateReady();

	let user = auth.currentUser;
	if (user) {
		try {
			// Verify cached emulator token is still accepted after emulator restarts
			await user.getIdToken(EMULATOR);
		} catch {
			await authModule.signOut(auth).catch(() => {});
			user = null;
		}
	}
	user ??= (await authModule.signInAnonymously(auth)).user;

	// Subscribe to RTDB server offset only after auth holds a verified active user/token
	const { onValue, ref } = dbModule;
	const offsetNode = ref(db, '.info/serverTimeOffset');
	if (off) off();
	let arrived: () => void = () => {};
	offsetArrived = new Promise((resolve) => (arrived = resolve));
	off = onValue(offsetNode, (snapshot) => {
		if (!snapshot.exists()) return;
		const value = Number(snapshot.val());
		serverOffset = Number.isFinite(value) ? value : 0;
		arrived();
	});

	logService.sessionUid = user.uid;
	rememberSession();
	logService.info(
		'network',
		user.isAnonymous ? 'anonymous session ready' : 'account session ready'
	);

	return { uid: user.uid, db, auth };
}

export function forget(): void {
	pending = null;
	logService.sessionUid = null;
	if (off) off();
	off = null;
	serverOffset = 0;
	offsetArrived = Promise.resolve();
}
