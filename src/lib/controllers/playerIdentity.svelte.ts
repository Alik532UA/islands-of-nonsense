import { isAvatar } from '$lib/config/avatars';
import { NAME_KEY, initialName, rerollIfTaken, randomPlayerName } from '$lib/config/playerName';
import { storage } from '$lib/services/storage';
import { preferredCountry, rememberCountry } from '$lib/services/countryPref';
import { playerAvatar } from '$lib/services/playerAvatar.svelte';

export class PlayerIdentity {
	value = $state('');
	country = $state('');
	#assigned = '';
	#shown = '';
	readonly #random: () => number;

	constructor(random: () => number = Math.random) {
		this.#random = random;
	}

	get avatar(): string {
		return playerAvatar.value;
	}

	get avatarChosen(): boolean {
		return playerAvatar.chosen;
	}

	chooseAvatar(next: string): void {
		if (!isAvatar(next)) return;
		playerAvatar.set(next);
	}

	async load(locale: string = 'uk', taken: readonly string[] = []): Promise<void> {
		if (this.value !== '') return;
		const chosen = initialName(storage.get(NAME_KEY), locale, this.#random, taken);
		this.value = chosen.name;
		this.#assigned = chosen.assigned;
		this.#shown = chosen.name;
	}

	adopt(name: string): void {
		if (!name || name === this.value) return;
		if (this.value !== '' && this.value !== this.#shown) return;

		this.value = name;
		this.#shown = name;
		this.#assigned = '';
		storage.set(NAME_KEY, name);
	}

	async loadCountry(): Promise<void> {
		this.country = await preferredCountry();
	}

	setCountry(code: string): void {
		this.country = code;
		rememberCountry(code);
	}

	reroll(locale: string = 'uk', taken: readonly string[] = []): void {
		this.value = randomPlayerName(locale, this.#random, [...taken, this.value.trim()]);
		this.#assigned = this.value;
		this.#shown = this.value;
	}

	settle(locale: string = 'uk', taken: readonly string[] = []): void {
		const swap = rerollIfTaken(this.value, this.#assigned, locale, this.#random, taken);
		if (swap === null) return;
		this.value = swap;
		this.#assigned = swap;
		this.#shown = swap;
	}

	forEntry(locale: string = 'uk', taken: readonly string[] = []): string {
		const who = this.value.trim() || randomPlayerName(locale, this.#random, taken);
		storage.set(NAME_KEY, who);
		return who;
	}
}
