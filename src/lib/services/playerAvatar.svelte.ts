import { AVATAR_KEY, AVATAR_RANDOM_KEY, isAvatar, normaliseAvatar, randomAvatar } from '$lib/config/avatars';
import { storage } from './storage';

export interface AvatarSnapshot {
	value: string;
	chosen: boolean;
}

function hydrate(random: () => number): AvatarSnapshot {
	const saved = storage.get(AVATAR_KEY);
	const isRandom = storage.get(AVATAR_RANDOM_KEY) !== null;

	if (saved !== null && isAvatar(saved)) {
		return { value: saved, chosen: !isRandom };
	}

	const fallback = randomAvatar(random);
	storage.set(AVATAR_KEY, fallback);
	storage.set(AVATAR_RANDOM_KEY, '1');
	return { value: fallback, chosen: false };
}

class PlayerAvatar {
	value = $state('');
	chosen = $state(false);

	constructor(random: () => number = Math.random) {
		const start = hydrate(random);
		this.value = start.value;
		this.chosen = start.chosen;
	}

	set(next: string): void {
		if (!isAvatar(next)) return;
		this.value = next;
		this.chosen = true;
		storage.set(AVATAR_KEY, next);
		storage.remove(AVATAR_RANDOM_KEY);
	}

	snapshot(): AvatarSnapshot {
		return { value: this.value, chosen: this.chosen };
	}

	restore(snapshot: AvatarSnapshot): void {
		if (snapshot.chosen) {
			this.set(snapshot.value);
			return;
		}
		this.value = normaliseAvatar(snapshot.value);
		this.chosen = false;
		if (this.value === '') {
			storage.remove(AVATAR_KEY);
			storage.remove(AVATAR_RANDOM_KEY);
			return;
		}
		storage.set(AVATAR_KEY, this.value);
		storage.set(AVATAR_RANDOM_KEY, '1');
	}
}

export const playerAvatar = new PlayerAvatar();
