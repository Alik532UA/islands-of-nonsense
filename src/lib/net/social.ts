import { connect } from './firebase';
import { withdrawLeader } from './leaders';
import { readRewards } from './rewards';
import { logService } from '$lib/services/logService.svelte';
import type { Profile } from './account';

export interface SocialPrivacy {
	search: boolean;
	follow: boolean;
	board: boolean;
	onlineStatus: boolean;
}

export const DEFAULT_PRIVACY: SocialPrivacy = {
	search: true,
	follow: true,
	board: true,
	onlineStatus: true
};

export interface SocialUser {
	uid: string;
	name: string;
	handle: string;
	country?: string;
	avatar?: string;
	at?: number;
	mutual?: boolean;
	online?: boolean;
	roomCode?: string;
}

export interface InboxItem {
	id: string;
	type: 'follower' | 'room_invite';
	fromUid: string;
	fromName: string;
	fromAvatar?: string;
	roomCode?: string;
	at: number;
}

export interface PublicPlayerProfile {
	uid: string;
	name: string;
	handle: string;
	country?: string;
	avatar?: string;
	level: number;
	title?: string;
	xp: number;
	achievementsCount: number;
	score: number;
	wins: number;
	plays: number;
	winRate: number;
	online: boolean;
	roomCode?: string;
}

export const SEARCH_LIMIT = 20;

export function markMutualConnections(
	following: readonly SocialUser[],
	followers: readonly SocialUser[]
): { following: SocialUser[]; followers: SocialUser[]; mutual: SocialUser[] } {
	const followerSet = new Set(followers.map((f) => f.uid));
	const followingSet = new Set(following.map((f) => f.uid));
	const nextFollowing = following.map((u) => ({ ...u, mutual: followerSet.has(u.uid) }));
	const nextFollowers = followers.map((u) => ({ ...u, mutual: followingSet.has(u.uid) }));
	const mutual = nextFollowing.filter((u) => u.mutual);
	return { following: nextFollowing, followers: nextFollowers, mutual };
}

export async function readPrivacy(): Promise<SocialPrivacy> {
	try {
		const { uid, db } = await connect();
		const { get, ref } = await import('firebase/database');
		const snap = await get(ref(db, `users/${uid}/privacy`));
		if (!snap.exists()) return { ...DEFAULT_PRIVACY };
		const raw = snap.val() as Partial<SocialPrivacy>;
		return {
			search: raw.search !== false,
			follow: raw.follow !== false,
			board: raw.board !== false,
			onlineStatus: raw.onlineStatus !== false
		};
	} catch {
		return { ...DEFAULT_PRIVACY };
	}
}

export async function savePrivacy(
	privacy: SocialPrivacy,
	profile?: Profile | null
): Promise<boolean> {
	try {
		const { auth, uid, db } = await connect();
		if (auth.currentUser?.isAnonymous ?? true) return false;
		const { ref, update } = await import('firebase/database');
		const updates: Record<string, unknown> = {
			[`users/${uid}/privacy`]: privacy
		};
		if (profile?.handle) {
			updates[`find/${profile.handle}`] = privacy.search
				? {
						uid,
						name: profile.name,
						handle: profile.handle,
						...(profile.country ? { country: profile.country } : {}),
						...(profile.avatar ? { avatar: profile.avatar } : {}),
						search: true
					}
				: null;
		}
		await update(ref(db), updates);
		if (!privacy.board) {
			await withdrawLeader();
		}
		return true;
	} catch (error) {
		logService.warn('social', 'savePrivacy failed', { reason: String(error) });
		return false;
	}
}

export async function searchHandles(queryText: string): Promise<SocialUser[]> {
	const prefix = queryText.trim().replace(/^@/, '').toLowerCase();
	if (prefix.length < 2) return [];
	try {
		const { uid, db } = await connect();
		const { endAt, get, limitToFirst, orderByKey, query, ref, startAt } =
			await import('firebase/database');
		const q = query(
			ref(db, 'find'),
			orderByKey(),
			startAt(prefix),
			endAt(`${prefix}\uf8ff`),
			limitToFirst(SEARCH_LIMIT)
		);
		const snap = await get(q);
		if (!snap.exists()) return [];
		const rows: SocialUser[] = [];
		snap.forEach((child) => {
			const val = child.val() as SocialUser | null;
			if (!val || val.uid === uid) return;
			rows.push({
				uid: val.uid,
				name: val.name,
				handle: val.handle,
				country: val.country,
				avatar: val.avatar
			});
		});
		return rows;
	} catch (error) {
		logService.warn('social', 'searchHandles failed', { reason: String(error) });
		return [];
	}
}

async function resolveUsers(uids: readonly string[]): Promise<SocialUser[]> {
	if (uids.length === 0) return [];
	const { db } = await connect();
	const { get, ref } = await import('firebase/database');
	const settled = await Promise.all(
		uids.map(async (targetUid): Promise<SocialUser | null> => {
			const snap = await get(ref(db, `users/${targetUid}/profile`)).catch(() => null);
			if (!snap?.exists()) return null;
			const p = snap.val() as Omit<Profile, 'uid'>;
			return {
				uid: targetUid,
				name: p.name,
				handle: p.handle,
				...(p.country ? { country: p.country } : {}),
				...(p.avatar ? { avatar: p.avatar } : {})
			};
		})
	);
	return settled.filter((u): u is SocialUser => u !== null);
}

export async function loadSocialLists(): Promise<{
	following: SocialUser[];
	followers: SocialUser[];
	mutual: SocialUser[];
}> {
	try {
		const { uid, db } = await connect();
		const { get, ref } = await import('firebase/database');
		const [fgSnap, frSnap] = await Promise.all([
			get(ref(db, `users/${uid}/following`)),
			get(ref(db, `users/${uid}/followers`))
		]);

		const fgUids = fgSnap.exists() ? Object.keys(fgSnap.val() as Record<string, unknown>) : [];
		const frUids = frSnap.exists() ? Object.keys(frSnap.val() as Record<string, unknown>) : [];
		const unique = [...new Set([...fgUids, ...frUids])];
		const resolved = await resolveUsers(unique);
		const byUid = new Map(resolved.map((u) => [u.uid, u]));

		const following = fgUids.map((id) => byUid.get(id)).filter((u): u is SocialUser => Boolean(u));
		const followers = frUids.map((id) => byUid.get(id)).filter((u): u is SocialUser => Boolean(u));

		return markMutualConnections(following, followers);
	} catch {
		return { following: [], followers: [], mutual: [] };
	}
}

export async function followUser(targetUid: string, myProfile: Profile | null): Promise<boolean> {
	try {
		const { auth, uid, db } = await connect();
		if ((auth.currentUser?.isAnonymous ?? true) || !targetUid || targetUid === uid) {
			return false;
		}
		const { push, ref, serverTimestamp, update } = await import('firebase/database');
		const stamp = serverTimestamp();
		const updates: Record<string, unknown> = {
			[`users/${uid}/following/${targetUid}`]: { at: stamp },
			[`users/${targetUid}/followers/${uid}`]: { at: stamp }
		};
		if (myProfile) {
			const inboxKey = push(ref(db, `users/${targetUid}/inbox`)).key;
			if (inboxKey) {
				updates[`users/${targetUid}/inbox/${inboxKey}`] = {
					type: 'follower',
					fromUid: uid,
					fromName: myProfile.name.slice(0, 48),
					...(myProfile.avatar ? { fromAvatar: myProfile.avatar } : {}),
					at: stamp
				};
			}
		}
		await update(ref(db), updates);
		return true;
	} catch (error) {
		logService.warn('social', 'followUser failed', { reason: String(error) });
		return false;
	}
}

export async function unfollowUser(targetUid: string): Promise<boolean> {
	try {
		const { uid, db } = await connect();
		const { ref, update } = await import('firebase/database');
		await update(ref(db), {
			[`users/${uid}/following/${targetUid}`]: null,
			[`users/${targetUid}/followers/${uid}`]: null
		});
		return true;
	} catch {
		return false;
	}
}

export async function removeFollowerUser(followerUid: string): Promise<boolean> {
	try {
		const { uid, db } = await connect();
		const { ref, update } = await import('firebase/database');
		await update(ref(db), {
			[`users/${uid}/followers/${followerUid}`]: null,
			[`users/${followerUid}/following/${uid}`]: null
		});
		return true;
	} catch {
		return false;
	}
}

export async function sendRoomInvite(
	targetUid: string,
	roomCode: string,
	fromName: string,
	fromAvatar?: string
): Promise<boolean> {
	try {
		const { auth, uid, db } = await connect();
		if ((auth.currentUser?.isAnonymous ?? true) || !targetUid || targetUid === uid) {
			return false;
		}
		const { push, ref, serverTimestamp, set } = await import('firebase/database');
		const itemRef = push(ref(db, `users/${targetUid}/inbox`));
		await set(itemRef, {
			type: 'room_invite',
			fromUid: uid,
			fromName: fromName.slice(0, 48),
			...(fromAvatar ? { fromAvatar } : {}),
			roomCode: roomCode.toUpperCase(),
			at: serverTimestamp()
		});
		return true;
	} catch {
		return false;
	}
}

export async function watchInbox(onItems: (items: InboxItem[]) => void): Promise<() => void> {
	try {
		const { uid, db } = await connect();
		const { onValue, ref } = await import('firebase/database');
		return onValue(ref(db, `users/${uid}/inbox`), (snap) => {
			if (!snap.exists()) {
				onItems([]);
				return;
			}
			const list: InboxItem[] = [];
			snap.forEach((child) => {
				if (!child.key) return;
				list.push({ id: child.key, ...(child.val() as Omit<InboxItem, 'id'>) });
			});
			list.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
			onItems(list);
		});
	} catch {
		return () => {};
	}
}

export async function dismissInboxItem(id: string): Promise<void> {
	try {
		const { uid, db } = await connect();
		const { ref, remove } = await import('firebase/database');
		await remove(ref(db, `users/${uid}/inbox/${id}`));
	} catch {
		// ignore
	}
}

export function sortFriendsForInvite(
	mutual: readonly SocialUser[],
	following: readonly SocialUser[],
	onlineUids: ReadonlySet<string> = new Set()
): SocialUser[] {
	const seen = new Set<string>();
	const mutualSet = new Set(mutual.map((u) => u.uid));
	const merged: SocialUser[] = [];
	for (const u of [...mutual, ...following]) {
		if (!u.uid || seen.has(u.uid)) continue;
		seen.add(u.uid);
		merged.push({
			...u,
			mutual: mutualSet.has(u.uid) || Boolean(u.mutual),
			online: Boolean(u.online || onlineUids.has(u.uid))
		});
	}
	return merged.sort((a, b) => {
		const aScore = (a.online ? 2 : 0) + (a.mutual ? 1 : 0);
		const bScore = (b.online ? 2 : 0) + (b.mutual ? 1 : 0);
		return bScore - aScore || a.name.localeCompare(b.name);
	});
}

export async function startPrivacyPresence(info: {
	name: string;
	handle?: string;
	country?: string;
	avatar?: string;
	roomCode?: string;
}): Promise<() => void> {
	const priv = await readPrivacy();
	return priv.onlineStatus ? trackGlobalPresence(info) : () => {};
}

export async function trackGlobalPresence(info: {
	name: string;
	handle?: string;
	country?: string;
	avatar?: string;
	roomCode?: string;
}): Promise<() => void> {
	try {
		const { uid, db } = await connect();
		const { onDisconnect, ref, remove, serverTimestamp, set } = await import('firebase/database');
		const node = ref(db, `presenceGlobal/${uid}`);
		const disc = onDisconnect(node);
		await disc.remove();
		await set(node, {
			uid,
			name: info.name.slice(0, 48),
			...(info.handle ? { handle: info.handle.slice(0, 20) } : {}),
			...(info.country && info.country.length === 2 ? { country: info.country } : {}),
			...(info.avatar ? { avatar: info.avatar } : {}),
			...(info.roomCode ? { roomCode: info.roomCode } : {}),
			at: serverTimestamp()
		});
		return () => {
			void disc.cancel();
			void remove(node);
		};
	} catch {
		return () => {};
	}
}

export async function watchGlobalPresence(
	onUsers: (users: SocialUser[]) => void
): Promise<() => void> {
	try {
		const { uid, db } = await connect();
		const { limitToLast, onValue, orderByChild, query, ref } = await import('firebase/database');
		const q = query(ref(db, 'presenceGlobal'), orderByChild('at'), limitToLast(30));
		return onValue(q, (snap) => {
			if (!snap.exists()) {
				onUsers([]);
				return;
			}
			const list: SocialUser[] = [];
			snap.forEach((child) => {
				const val = child.val() as SocialUser | null;
				if (!val || val.uid === uid) return;
				list.push({ ...val, online: true });
			});
			onUsers(list.reverse());
		});
	} catch {
		return () => {};
	}
}

export async function readPublicPlayerProfile(
	targetUid: string
): Promise<PublicPlayerProfile | null> {
	try {
		const { db } = await connect();
		const { get, ref } = await import('firebase/database');
		const [profSnap, leaderSnap, rewardsData, presSnap] = await Promise.all([
			get(ref(db, `users/${targetUid}/profile`)),
			get(ref(db, `leaders/${targetUid}`)),
			readRewards(targetUid),
			get(ref(db, `presenceGlobal/${targetUid}`))
		]);
		if (!profSnap.exists() && !leaderSnap.exists()) return null;
		const prof = (profSnap.val() ?? {}) as Partial<Profile>;
		const leader = (leaderSnap.val() ?? {}) as {
			name?: string;
			handle?: string;
			country?: string;
			avatar?: string;
			score?: number;
			wins?: number;
			plays?: number;
			winRate?: number;
			level?: number;
			title?: string;
		};
		const pres = presSnap.exists() ? (presSnap.val() as { roomCode?: string }) : null;
		const wins = leader.wins ?? 0;
		const plays = leader.plays ?? wins;
		const winRate = leader.winRate ?? (plays > 0 ? Math.round((wins / plays) * 100) : 0);

		return {
			uid: targetUid,
			name: prof.name ?? leader.name ?? 'Гравець',
			handle: prof.handle ?? leader.handle ?? 'player',
			country: prof.country ?? leader.country,
			avatar: prof.avatar ?? leader.avatar,
			level: rewardsData?.level ?? leader.level ?? 1,
			title: rewardsData?.equippedTitle ?? leader.title ?? 'recruit',
			xp: rewardsData?.xp ?? 0,
			achievementsCount: rewardsData ? Object.keys(rewardsData.unlocked).length : 0,
			score: leader.score ?? 0,
			wins,
			plays,
			winRate,
			online: Boolean(pres),
			roomCode: pres?.roomCode
		};
	} catch {
		return null;
	}
}
