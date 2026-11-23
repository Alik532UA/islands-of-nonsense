import {
	accountState,
	currentUserInfo,
	linkEmail,
	readProfile,
	saveProfile,
	signInEmail,
	signOut as authSignOut,
	type AccountState,
	type Profile
} from '$lib/net/account';
import { readPlay, mergePlay, EMPTY_PLAY, type PlayData } from '$lib/net/play';
import { publishLeader, topLeaders, type Leader } from '$lib/net/leaders';
import { logService } from '$lib/services/logService.svelte';
import { storage } from '$lib/services/storage';

const LOCAL_PLAY_KEY = 'play_data';

export class AccountController {
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
			this.state = info.isAnonymous ? 'anonymous' : 'linked';
			this.email = info.email ?? null;

			const prof = await readProfile();
			if (prof) {
				this.profile = prof;
			}

			const local = storage.getJSON<PlayData>(LOCAL_PLAY_KEY, EMPTY_PLAY);
			const cloud = await readPlay();
			this.playData = mergePlay(local, cloud);
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

	async link(email: string, pass: string): Promise<boolean> {
		this.busy = true;
		this.error = null;
		try {
			await linkEmail(email, pass);
			this.state = 'linked';
			this.email = email;
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
					void publishLeader(profile, this.playData.score);
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
