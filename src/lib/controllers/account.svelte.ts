import {
	currentUserInfo,
	linkEmail,
	readProfile,
	saveProfile,
	signInEmail,
	signOut as authSignOut,
	type AccountState,
	type Profile
} from '$lib/net/account';
import { readPlay, mergePlay, writePlay, EMPTY_PLAY, type PlayData } from '$lib/net/play';
import { publishLeader, topLeaders, withdrawLeader, type Leader } from '$lib/net/leaders';
import {
	buildLeaderStats,
	getLocalPlayData,
	saveLocalPlayData
} from '$lib/services/matchProgress.svelte';
import { logService } from '$lib/services/logService.svelte';

export class AccountController {
	public uid = $state<string | null>(null);
	public state = $state<AccountState>('anonymous');
	public email = $state<string | null>(null);
	public profile = $state<Profile | null>(null);
	public playData = $state<PlayData>(EMPTY_PLAY);
	public leaders = $state<Leader[]>([]);
	public busy = $state(false);
	public error = $state<string | null>(null);

	async load() {
		this.busy = true;
		this.error = null;
		try {
			const info = await currentUserInfo();
			this.uid = info.uid;
			this.state = info.isAnonymous ? 'anonymous' : 'linked';
			this.email = info.email ?? null;

			const prof = await readProfile();
			if (prof) {
				this.profile = prof;
			}

			const local = getLocalPlayData();
			const cloud = this.state === 'linked' ? await readPlay() : null;
			const merged = mergePlay(local, cloud);
			this.playData = merged;
			saveLocalPlayData(merged);

			if (
				this.state === 'linked' &&
				merged.score > 0 &&
				(!cloud ||
					merged.score > cloud.score ||
					(merged.games.castlefight?.plays ?? 0) > (cloud.games.castlefight?.plays ?? 0))
			) {
				void writePlay(merged);
			}
		} catch (err) {
			logService.warn('account', 'Account controller load failed', { err: String(err) });
			this.error = String(err);
		} finally {
			this.busy = false;
		}
	}

	async loadLeaders() {
		try {
			this.leaders = await topLeaders();
		} catch (err) {
			logService.warn('account', 'Load leaders failed', { err: String(err) });
		}
	}

	async publishToLeaderboard(): Promise<boolean> {
		if (this.state !== 'linked' || !this.profile || this.playData.score <= 0) return false;
		const ok = await publishLeader(
			this.profile,
			this.playData.score,
			buildLeaderStats(this.playData)
		);
		if (ok) {
			await this.loadLeaders();
		}
		return ok;
	}

	async withdrawFromLeaderboard(): Promise<void> {
		await withdrawLeader();
		await this.loadLeaders();
	}

	async link(email: string, pass: string): Promise<boolean> {
		this.busy = true;
		this.error = null;
		try {
			await linkEmail(email, pass);
			this.state = 'linked';
			this.email = email;
			if (this.playData.score > 0) {
				void writePlay(this.playData);
			}
			return true;
		} catch (err) {
			this.error = (err as Error).message;
			return false;
		} finally {
			this.busy = false;
		}
	}

	async signIn(email: string, pass: string): Promise<boolean> {
		this.busy = true;
		this.error = null;
		try {
			await signInEmail(email, pass);
			await this.load();
			return true;
		} catch (err) {
			this.error = (err as Error).message;
			return false;
		} finally {
			this.busy = false;
		}
	}

	async signOut(): Promise<void> {
		this.busy = true;
		try {
			await authSignOut();
			this.profile = null;
			await this.load();
		} catch (err) {
			this.error = (err as Error).message;
		} finally {
			this.busy = false;
		}
	}

	async save(profile: Profile): Promise<boolean> {
		this.busy = true;
		this.error = null;
		try {
			const ok = await saveProfile(profile);
			if (ok) {
				this.profile = profile;
				if (this.playData.score > 0) {
					void writePlay(this.playData);
					void publishLeader(profile, this.playData.score, buildLeaderStats(this.playData));
				}
			}
			return ok;
		} catch (err) {
			this.error = (err as Error).message;
			return false;
		} finally {
			this.busy = false;
		}
	}
}
