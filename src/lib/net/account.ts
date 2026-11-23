import { connect, forget } from './firebase';
import { logService } from '$lib/services/logService.svelte';

export interface Profile {
	uid: string;
	name: string;
	handle: string;
	country?: string;
	avatar?: string;
}

export type AccountState = 'anonymous' | 'linked';

export async function accountState(): Promise<AccountState> {
	const { auth } = await connect();
	const user = auth.currentUser;
	return user && !user.isAnonymous ? 'linked' : 'anonymous';
}

export async function currentUserInfo(): Promise<{ uid: string; email?: string | null; isAnonymous: boolean }> {
	const { auth, uid } = await connect();
	return {
		uid,
		email: auth.currentUser?.email,
		isAnonymous: auth.currentUser?.isAnonymous ?? true
	};
}

export async function linkEmail(email: string, password: string): Promise<void> {
	const { auth } = await connect();
	const user = auth.currentUser;
	if (!user) throw new Error('no-user');

	const { EmailAuthProvider, linkWithCredential } = await import('firebase/auth');
	const credential = EmailAuthProvider.credential(email, password);
	await linkWithCredential(user, credential);
	await user.getIdToken(true);
}

export async function signInEmail(email: string, password: string): Promise<void> {
	const { auth } = await connect();
	const { signInWithEmailAndPassword } = await import('firebase/auth');
	await signInWithEmailAndPassword(auth, email, password);
	forget();
}

export async function signInGoogle(): Promise<void> {
	const { auth } = await connect();
	const user = auth.currentUser;
	const { GoogleAuthProvider, linkWithPopup, signInWithCredential, signInWithPopup } =
		await import('firebase/auth');

	const provider = new GoogleAuthProvider();
	if (!user) {
		await signInWithPopup(auth, provider);
		return;
	}

	try {
		await linkWithPopup(user, provider);
		await user.getIdToken(true);
	} catch (error) {
		const code = (error as { code?: string }).code ?? '';
		if (code !== 'auth/credential-already-in-use') throw error;

		const credential = GoogleAuthProvider.credentialFromError(
			error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
		);
		if (!credential) throw error;
		await signInWithCredential(auth, credential);
		forget();
	}
}

export async function signOut(): Promise<void> {
	const { auth } = await connect();
	const { signInAnonymously, signOut: leave } = await import('firebase/auth');
	await leave(auth);
	await signInAnonymously(auth);
	forget();
}

export async function handleFree(handle: string): Promise<boolean> {
	if (!handle) return false;
	try {
		const { uid, db } = await connect();
		const { get, ref } = await import('firebase/database');
		const owner = (await get(ref(db, `handles/${handle}`))).val();
		if (owner === null || owner === uid) return true;
		const named = (await get(ref(db, `users/${owner}/profile/handle`))).val();
		return named !== handle;
	} catch (error) {
		logService.warn('network', 'handle check failed', { reason: String(error) });
		return false;
	}
}

export async function readProfile(): Promise<Profile | null> {
	try {
		const { uid, db } = await connect();
		const { get, ref } = await import('firebase/database');
		const snap = await get(ref(db, `users/${uid}/profile`));
		if (!snap.exists()) return null;
		return { uid, ...(snap.val() as Omit<Profile, 'uid'>) };
	} catch (error) {
		logService.warn('network', 'read profile failed', { reason: String(error) });
		return null;
	}
}

export async function saveProfile(profile: Profile): Promise<boolean> {
	try {
		const { uid, db } = await connect();
		const { ref, update } = await import('firebase/database');

		const updates: Record<string, unknown> = {
			[`users/${uid}/profile`]: {
				name: profile.name,
				handle: profile.handle,
				...(profile.country ? { country: profile.country } : {}),
				...(profile.avatar ? { avatar: profile.avatar } : {})
			},
			[`handles/${profile.handle}`]: uid
		};

		await update(ref(db), updates);
		return true;
	} catch (error) {
		logService.warn('network', 'save profile failed', { reason: String(error) });
		return false;
	}
}

export async function saveName(name: string): Promise<void> {
	const { uid, db } = await connect();
	const { ref, set } = await import('firebase/database');
	await set(ref(db, `users/${uid}/profile/name`), name);
}

export async function saveAvatar(avatar: string): Promise<void> {
	const { uid, db } = await connect();
	const { ref, set } = await import('firebase/database');
	await set(ref(db, `users/${uid}/profile/avatar`), avatar);
}
