import type { Database } from 'firebase/database';
import { connect } from './firebase';

/**
 * Manages player presence in a match room.
 */
export function keepPresence(db: Database, roomCode: string, uid: string): () => void {
	let cancelled = false;
	let unsubscribe = () => {};

	void import('firebase/database').then(({ ref, onValue, set, onDisconnect, serverTimestamp }) => {
		if (cancelled) return;
		const connectedRef = ref(db, '.info/connected');
		const userPresenceRef = ref(db, `rooms/${roomCode}/presence/${uid}`);

		unsubscribe = onValue(connectedRef, (snap) => {
			if (snap.val() === true) {
				const disconnect = onDisconnect(userPresenceRef);
				void disconnect.remove();
				void set(userPresenceRef, {
					online: true,
					lastSeen: serverTimestamp()
				});
			}
		});
	});

	return () => {
		cancelled = true;
		unsubscribe();
	};
}

export async function trackPresence(code: string): Promise<() => void> {
	const { uid, db } = await connect();
	return keepPresence(db, code, uid);
}

export async function watchPresence(
	code: string,
	onChange: (online: string[]) => void
): Promise<() => void> {
	const { db } = await connect();
	const { ref, onValue } = await import('firebase/database');
	return onValue(ref(db, `rooms/${code}/presence`), (snap) => {
		const val = snap.val() as Record<string, { online?: boolean }> | null;
		if (!val) {
			onChange([]);
			return;
		}
		const onlineUids = Object.entries(val)
			.filter(([, data]) => data?.online === true)
			.map(([uid]) => uid);
		onChange(onlineUids);
	});
}
