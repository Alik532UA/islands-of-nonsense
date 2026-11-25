import { connect, forget } from './firebase';
import { logService } from '$lib/services/logService.svelte';
import { storage } from '$lib/services/storage';
import {
	HIGH_SCORE_KEY,
	LOCAL_PLAY_KEY,
	MATCH_HISTORY_KEY
} from '$lib/services/matchProgress.svelte';
import { REWARDS_STORAGE_KEY } from '$lib/services/rewardsService.svelte';

export interface EraseSnapshot {
	uid: string;
	handle?: string | null;
	followingUids?: readonly string[];
	followerUids?: readonly string[];
	ownedRooms?: readonly { code: string; gameId?: string }[];
}

/**
 * Builds an atomic RTDB multi-path deletion map complying with `database.rules.json`.
 */
export function buildErasePatch(snapshot: EraseSnapshot): Record<string, null> {
	const patch: Record<string, null> = {};
	const { uid, handle, followingUids = [], followerUids = [], ownedRooms = [] } = snapshot;

	for (const room of ownedRooms) {
		if (!room.code) continue;
		const gameId = room.gameId || 'castlefight';
		patch[`rooms/${room.code}`] = null;
		patch[`lobby/${gameId}/${room.code}`] = null;
	}

	for (const targetUid of followingUids) {
		if (targetUid && targetUid !== uid) {
			patch[`users/${targetUid}/followers/${uid}`] = null;
		}
	}
	for (const followerUid of followerUids) {
		if (followerUid && followerUid !== uid) {
			patch[`users/${followerUid}/following/${uid}`] = null;
		}
	}

	if (handle) {
		patch[`handles/${handle}`] = null;
		patch[`find/${handle}`] = null;
	}

	patch[`leaders/${uid}`] = null;
	patch[`chatCooldowns/${uid}`] = null;
	patch[`presenceGlobal/${uid}`] = null;
	patch[`myRooms/${uid}`] = null;
	patch[`users/${uid}`] = null;

	return patch;
}

/**
 * Erases all RTDB user records, owned rooms, handles, and local player caches.
 */
export async function eraseMyData(): Promise<boolean> {
	try {
		const { uid, db } = await connect();
		const { get, ref, update } = await import('firebase/database');
		const [handleSnap, followingSnap, followersSnap, myRoomsSnap] = await Promise.all([
			get(ref(db, `users/${uid}/profile/handle`)),
			get(ref(db, `users/${uid}/following`)),
			get(ref(db, `users/${uid}/followers`)),
			get(ref(db, `myRooms/${uid}`))
		]);

		const handle = handleSnap.exists() ? String(handleSnap.val()) : null;
		const followingUids = followingSnap.exists() ? Object.keys(followingSnap.val() as object) : [];
		const followerUids = followersSnap.exists() ? Object.keys(followersSnap.val() as object) : [];
		const roomCodes = myRoomsSnap.exists() ? Object.keys(myRoomsSnap.val() as object) : [];

		const ownedRooms: { code: string; gameId?: string }[] = [];
		for (const code of roomCodes) {
			const infoSnap = await get(ref(db, `rooms/${code}/info`)).catch(() => null);
			if (infoSnap?.exists()) {
				const val = infoSnap.val() as { hostUid?: string; gameId?: string };
				if (val.hostUid === uid) {
					ownedRooms.push({ code, gameId: val.gameId });
				}
			}
		}

		const patch = buildErasePatch({
			uid,
			handle,
			followingUids,
			followerUids,
			ownedRooms
		});
		await update(ref(db), patch);

		storage.remove(LOCAL_PLAY_KEY);
		storage.remove(HIGH_SCORE_KEY);
		storage.remove(MATCH_HISTORY_KEY);
		storage.remove(REWARDS_STORAGE_KEY);
		return true;
	} catch (error) {
		logService.warn('account', 'erase user data failed', { reason: String(error) });
		return false;
	}
}

/**
 * Re-authenticates if needed, erases user data, deletes Auth account, and restores an anonymous session.
 */
export async function deleteAccount(password?: string): Promise<void> {
	const { auth } = await connect();
	const user = auth.currentUser;
	if (!user) throw new Error('no-user');

	const hasEmailProvider = user.providerData.some((p) => p.providerId === 'password');
	if (!user.isAnonymous && hasEmailProvider && user.email) {
		if (!password) throw new Error('password-required');
		const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
		const cred = EmailAuthProvider.credential(user.email, password);
		await reauthenticateWithCredential(user, cred);
	} else if (!user.isAnonymous) {
		const { GoogleAuthProvider, reauthenticateWithPopup } = await import('firebase/auth');
		await reauthenticateWithPopup(user, new GoogleAuthProvider());
	}

	await eraseMyData();
	const { deleteUser, signInAnonymously } = await import('firebase/auth');
	await deleteUser(user);
	await signInAnonymously(auth);
	forget();
}
