import type { Database } from 'firebase/database';

/**
 * Manages player presence in a match room.
 */
export function keepPresence(
	db: Database,
	roomCode: string,
	uid: string
): () => void {
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
