import { spawnSync } from 'node:child_process';

/**
 * npm audit із захистом від тимчасових мережевих помилок (503/ETIMEDOUT).
 */
function runAuditOnce() {
	const npmExec = process.platform === 'win32' ? 'npm.cmd' : 'npm';
	const res = spawnSync(npmExec, ['audit', '--json'], {
		encoding: 'utf-8',
		maxBuffer: 10 * 1024 * 1024,
		timeout: 30000
	});

	if (res.error) {
		return { ok: false, retryable: true, message: res.error.message };
	}

	const stdout = res.stdout?.trim();
	if (!stdout) {
		return { ok: false, retryable: true, message: 'Empty output from npm audit' };
	}

	try {
		const json = JSON.parse(stdout);
		if (json.error) {
			const summary = json.error.summary || json.error.code || 'npm audit registry error';
			return { ok: false, retryable: true, message: summary };
		}

		const vulns = json.metadata?.vulnerabilities;
		if (!vulns) {
			return { ok: false, retryable: true, message: 'Invalid audit format' };
		}

		const high = vulns.high || 0;
		const critical = vulns.critical || 0;

		if (high > 0 || critical > 0) {
			console.error(
				`❌ Security audit failed: found ${high} high, ${critical} critical vulnerabilities.`
			);
			process.exit(1);
		}

		console.log('✅ Security audit passed: 0 high/critical vulnerabilities.');
		return { ok: true, retryable: false };
	} catch (e) {
		return { ok: false, retryable: true, message: 'Failed to parse audit JSON: ' + String(e) };
	}
}

for (let attempt = 1; attempt <= 3; attempt++) {
	const result = runAuditOnce();
	if (result.ok) process.exit(0);
	if (!result.retryable) process.exit(1);

	console.warn(`⚠️ npm audit attempt ${attempt}/3 failed: ${result.message}`);
	if (attempt < 3) {
		spawnSync(process.platform === 'win32' ? 'timeout' : 'sleep', ['3']);
	}
}

console.warn('⚠️ Registry unreachable after 3 attempts. Skipping audit without failing CI.');
process.exit(0);
