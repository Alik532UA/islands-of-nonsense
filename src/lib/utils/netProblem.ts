import { isDenied } from '$lib/net/denied';
import { checkLiveRules, type RulesState } from '$lib/net/rulesLive';

export type NetProblemKind = 'offline' | 'reload' | 'mismatch' | 'rules' | 'emulator' | 'code';

export interface NetProblem {
	kind: NetProblemKind;
	title: string;
	message: string;
	recoverable: boolean;
}

export interface ClassifyNetProblemOptions {
	online?: boolean;
	rulesState?: RulesState;
}

function errorText(error: unknown): string {
	if (error instanceof Error) {
		const code = (error as { code?: unknown }).code;
		return `${typeof code === 'string' ? `${code} ` : ''}${error.message}`;
	}
	return String(error ?? '');
}

const PROBLEMS: Record<NetProblemKind, NetProblem> = {
	offline: {
		kind: 'offline',
		title: 'Немає з’єднання',
		message: 'Перевірте доступ до інтернету та повторіть спробу.',
		recoverable: true
	},
	emulator: {
		kind: 'emulator',
		title: 'Емулятор Firebase не запущено',
		message: 'Запустіть локальний емулятор Firebase або перемкніться на прод-конфіг.',
		recoverable: true
	},
	rules: {
		kind: 'rules',
		title: 'Оновіть гру (версія правил Firebase змінилась)',
		message: 'Правила бази даних оновились або доступ заборонено. Оновіть сторінку.',
		recoverable: true
	},
	reload: {
		kind: 'reload',
		title: 'Клієнт застарів',
		message: 'Частину застосунку оновлено на сервері. Перезавантажте сторінку.',
		recoverable: true
	},
	mismatch: {
		kind: 'mismatch',
		title: 'Розбіжність стану матчу',
		message: 'Стан кімнати або симуляції не збігається з іншим гравцем.',
		recoverable: true
	},
	code: {
		kind: 'code',
		title: 'Помилка мережевої кімнати',
		message: 'Не вдалося завершити мережеву операцію. Спробуйте ще раз.',
		recoverable: false
	}
};

/**
 * Classifies network, Firebase, or dynamic-module errors into actionable UX categories.
 */
export function classifyNetProblem(
	error: unknown,
	options: ClassifyNetProblemOptions = {}
): NetProblem {
	const msg = errorText(error);
	const browserOnline =
		options.online ??
		(typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
			? navigator.onLine
			: true);

	if (/emulator is not running/i.test(msg)) {
		return { ...PROBLEMS.emulator };
	}

	if (
		/Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
			msg
		)
	) {
		return { ...PROBLEMS.reload };
	}

	if (
		!browserOnline ||
		/network[-_ ]request[-_ ]failed|ERR_INTERNET_DISCONNECTED|unavailable|timeout|Failed to fetch/i.test(
			msg
		)
	) {
		return { ...PROBLEMS.offline };
	}

	if (options.rulesState === 'stale' || isDenied(error)) {
		return { ...PROBLEMS.rules };
	}

	if (/desync|checksum mismatch|rules_version|stamp/i.test(msg)) {
		return { ...PROBLEMS.mismatch };
	}

	return { ...PROBLEMS.code };
}

/**
 * Probes live RTDB `__rulesVersion` when permission is denied so stale clients get an upgrade prompt.
 */
export async function probeNetProblem(error: unknown): Promise<NetProblem> {
	if (isDenied(error)) {
		const rulesState = await checkLiveRules(2000).catch(() => 'unknown' as const);
		return classifyNetProblem(error, { rulesState });
	}
	return classifyNetProblem(error);
}
