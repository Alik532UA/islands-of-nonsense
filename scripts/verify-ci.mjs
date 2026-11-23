#!/usr/bin/env node
/**
 * Fast composite CI verification script for Islands of Nonsense
 * Validates:
 * 1. Database RTDB rules syntax & append-only security checks
 * 2. Rules timestamp and checksum synchronization
 * 3. Package scripts & test configuration invariants
 * 4. Svelte / TypeScript compile diagnostics
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const cwd = process.cwd();
console.log('🚀 Running Islands of Nonsense CI Verification Suite...\n');

function step(name, fn) {
	process.stdout.write(`⏳ [CI] ${name}... `);
	const start = Date.now();
	try {
		fn();
		const duration = ((Date.now() - start) / 1000).toFixed(2);
		console.log(`✅ Passed (${duration}s)`);
	} catch (err) {
		console.error(`\n❌ Failed at step: ${name}`);
		console.error(err.message || err);
		process.exit(1);
	}
}

// 1. Rules Check
step('Verifying Firebase RTDB security rules', () => {
	execSync('node scripts/check-rules.mjs', { cwd, stdio: 'pipe' });
	execSync('node scripts/rules-stamp.mjs --check', { cwd, stdio: 'pipe' });
});

// 2. Package manifest invariants
step('Checking package.json script invariants', () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
	const requiredScripts = ['test', 'check', 'check:rules', 'build', 'verify'];
	for (const s of requiredScripts) {
		if (!pkg.scripts[s]) {
			throw new Error(`Missing required script in package.json: "${s}"`);
		}
	}
});

// 3. TypeScript / Svelte-check
step('Validating TypeScript & Svelte types', () => {
	execSync('npx svelte-kit sync', { cwd, stdio: 'pipe' });
	execSync('npx svelte-check --tsconfig ./tsconfig.json', { cwd, stdio: 'pipe' });
});

console.log('\n🎉 All Islands of Nonsense CI integrity checks passed successfully!\n');
