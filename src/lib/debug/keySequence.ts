// src/lib/debug/keySequence.ts — лише коли збір логів із пристроїв (DEBUGGING § 3): серія натискань і єдиний глобальний обробник службових жестів
import { shortcutLetter } from '$lib/hotkeys/hotkeys';

export interface KeyStroke {
	/** Літера з `shortcutLetter()` (HOTKEYS § 1.3); `null` — клавіша без літери. */
	letter: string | null;
	/** Фізична клавіша — лише щоб упізнати сам модифікатор. */
	code: string;
	repeat?: boolean;
	ctrlKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
	target?: EventTarget | null;
}

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const MODIFIER = /^(?:Shift|Control|Alt|Meta)(?:Left|Right)$/;

/** Поле вводу — через `closest`: фокус у `contenteditable` стоїть на вкладеному вузлі. */
export function isEditableTarget(target: EventTarget | null | undefined): boolean {
	const element = target as Partial<Element> | null | undefined;
	return typeof element?.closest === 'function' && element.closest(EDITABLE) !== null;
}

export function createKeySequence(options: {
	/** Мала латинська літера. Читається тією самою `shortcutLetter()`, що й решта скорочень проєкту. */
	letter: string;
	/** Функцією — коли поріг залежить від стану, який жест сам і змінює (§ 3.3). */
	threshold: number | (() => number);
	/** Найбільша пауза між натисканнями серії. */
	windowMs?: number;
	onComplete: () => void;
}) {
	const windowMs = options.windowMs ?? 2000;
	let count = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function reset(): void {
		count = 0;
		clearTimeout(timer);
		timer = undefined;
	}

	return {
		/** true — серію завершено цим натисканням. */
		handle(stroke: KeyStroke): boolean {
			// Затиснута клавіша — одне натискання, а набір у полі — не жест і не скидання.
			if (stroke.repeat || isEditableTarget(stroke.target) || MODIFIER.test(stroke.code))
				return false;
			if (stroke.letter !== options.letter || stroke.ctrlKey || stroke.altKey || stroke.metaKey) {
				reset();
				return false;
			}
			count += 1;
			clearTimeout(timer);
			const threshold =
				typeof options.threshold === 'function' ? options.threshold() : options.threshold;
			if (count >= threshold) {
				reset();
				options.onComplete();
				return true;
			}
			timer = setTimeout(reset, windowMs);
			return false;
		},
		get count(): number {
			return count;
		},
		reset
	};
}

export type KeySequence = ReturnType<typeof createKeySequence>;

/** Єдиний глобальний обробник жестів (HOTKEYS § 6 дозволяє його лише тут); повертає зняття. */
export function listenForSequences(...sequences: KeySequence[]): () => void {
	if (typeof window === 'undefined') return () => {};
	const onKeydown = (event: KeyboardEvent) => {
		const target =
			typeof event.composedPath === 'function' && event.composedPath().length > 0
				? event.composedPath()[0]
				: event.target;
		const stroke: KeyStroke = {
			// Та сама літера на кирилиці, AZERTY і Dvorak, що й у гарячих клавіш (HOTKEYS § 1.3).
			letter: shortcutLetter(event),
			code: event.code,
			repeat: event.repeat,
			ctrlKey: event.ctrlKey,
			altKey: event.altKey,
			metaKey: event.metaKey,
			// Подія з тіньового DOM ретаргетиться на хост: поле всередині видно лише з composedPath().
			target
		};
		// Кожна серія бачить кожну клавішу: інакше чужа клавіша її не скине.
		if (sequences.map((sequence) => sequence.handle(stroke)).some(Boolean)) event.preventDefault();
	};
	window.addEventListener('keydown', onKeydown);
	return () => {
		window.removeEventListener('keydown', onKeydown);
		for (const sequence of sequences) sequence.reset();
	};
}
