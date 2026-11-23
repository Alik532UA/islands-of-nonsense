import { connect } from './firebase';
import { logService } from '$lib/services/logService.svelte';
import type { Profile } from './account';

export const BOARD_LIMIT = 50;
export const BOARD_MIN_SCORE = 1;

export interface Leader {
	uid: string;
	name: string;
	handle: string;
	score: number;
	country?: string;
	avatar?: string;
}

export async function publishLeader(profile: Profile, score: number): Promise<boolean> {
	try {
		const { uid, db } = await connect();
		const { ref, serverTimestamp, set } = await import('firebase/database');
		await set(ref(db, `leaders/${uid}`), {
			name: profile.name,
			handle: profile.handle,
			score,
			...(profile.country ? { country: profile.country } : {}),
			...(profile.avatar ? { avatar: profile.avatar } : {}),
			at: serverTimestamp()
		});
		return true;
	} catch (error) {
		logService.warn('network', 'leader row not published', { reason: String(error) });
		return false;
	}
}

export async function withdrawLeader(): Promise<void> {
	try {
		const { uid, db } = await connect();
		const { ref, remove } = await import('firebase/database');
		await remove(ref(db, `leaders/${uid}`));
	} catch (error) {
		logService.warn('network', 'leader row not withdrawn', { reason: String(error) });
	}
}

export async function topLeaders(): Promise<Leader[]> {
	try {
		const { db } = await connect();
		const { get, limitToLast, orderByChild, query, ref } = await import('firebase/database');
		const found = await get(
			query(ref(db, 'leaders'), orderByChild('score'), limitToLast(BOARD_LIMIT))
		);
		if (!found.exists()) return [];

		const rows: Leader[] = [];
		found.forEach((child) => {
			rows.push({ uid: child.key as string, ...(child.val() as Omit<Leader, 'uid'>) });
		});
		return rows.reverse();
	} catch (error) {
		logService.warn('network', 'leaders not read', { reason: String(error) });
		return [];
	}
}
