import { isDenied } from './denied';
import { connect } from './firebase';
import { RULES_STAMP } from './rulesVersion';

export type RulesState = 'fresh' | 'stale' | 'unknown';

export function classifyRulesProbeResult(exists: boolean, error?: unknown): RulesState {
	if (error !== undefined) {
		return isDenied(error) ? 'stale' : 'unknown';
	}
	return exists ? 'fresh' : 'stale';
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
		const snap = await Promise.race([
			get(ref(db, `__rulesVersion/${RULES_STAMP}`)),
			timeoutPromise
		]);
		return classifyRulesProbeResult(snap.exists());
	} catch (error) {
		return classifyRulesProbeResult(false, error);
	} finally {
		if (timer) clearTimeout(timer);
	}
}
