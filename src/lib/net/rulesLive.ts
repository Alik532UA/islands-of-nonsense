import { isDenied } from './denied';
import { connect } from './firebase';
import { RULES_STAMP } from './rulesVersion';

export type RulesState = 'fresh' | 'stale' | 'unknown';

/**
 * Classifies the outcome of reading `/__rulesVersion/${RULES_STAMP}`.
 * Because `/__rulesVersion` is an empty `.read`-gated sentinel node in RTDB,
 * a resolved read (`allowed = true`, even when `snap.exists() === false`) means live rules match;
 * only an explicit permission denial marks rules as `'stale'`.
 */
export function classifyRulesProbeResult(allowed: boolean, error?: unknown): RulesState {
	if (error !== undefined) {
		return isDenied(error) ? 'stale' : 'unknown';
	}
	return allowed ? 'fresh' : 'stale';
}

/**
 * Probes RTDB `/__rulesVersion/${RULES_STAMP}` to check whether live rules match this client build.
 */
export async function checkLiveRules(timeoutMs = 2500): Promise<RulesState> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const { db } = await connect();
		const { get, ref } = await import('firebase/database');
		const timeoutPromise = new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error('rules_probe_timeout')), timeoutMs);
		});
		await Promise.race([get(ref(db, `__rulesVersion/${RULES_STAMP}`)), timeoutPromise]);
		// Reading `/__rulesVersion/${RULES_STAMP}` succeeds without error only when live rules allow that exact stamp.
		return classifyRulesProbeResult(true);
	} catch (error) {
		return classifyRulesProbeResult(false, error);
	} finally {
		if (timer) clearTimeout(timer);
	}
}
