#!/usr/bin/env node
/**
 * Translation parity check gate (I18N-v10 § 7.1)
 * Enforces:
 * - 100% key parity between all locales
 * - Non-empty string values for every key
 * - Identical set of {param} placeholders across all language variants
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = resolve(import.meta.dirname, '..');
const i18nPath = resolve(rootDir, 'src/lib/i18n/index.ts');

async function run() {
	const { translations } = await import(pathToFileURL(i18nPath).href);
	const locales = Object.keys(translations);

	if (locales.length < 2) {
		console.error('❌ check:i18n requires at least 2 locales for parity verification.');
		process.exit(1);
	}

	const problems = [];
	const [primaryLocale, ...otherLocales] = locales;
	const primaryKeys = new Set(Object.keys(translations[primaryLocale]));

	// 1. Check emptiness in all locales
	for (const loc of locales) {
		const dict = translations[loc];
		for (const [key, val] of Object.entries(dict)) {
			if (typeof val !== 'string' || val.trim().length === 0) {
				problems.push(`[${loc}] Key "${key}" has empty or non-string translation value`);
			}
		}
	}

	// 2. Check key parity & placeholder parity against other locales
	for (const loc of otherLocales) {
		const otherKeys = new Set(Object.keys(translations[loc]));

		// Missing in other
		for (const key of primaryKeys) {
			if (!otherKeys.has(key)) {
				problems.push(`[${loc}] Missing translation key: "${key}" (present in ${primaryLocale})`);
			}
		}

		// Extraneous in other
		for (const key of otherKeys) {
			if (!primaryKeys.has(key)) {
				problems.push(`[${loc}] Extraneous translation key: "${key}" (missing in ${primaryLocale})`);
			}
		}

		// Placeholders parity
		for (const key of primaryKeys) {
			if (!otherKeys.has(key)) continue;
			const primaryVal = translations[primaryLocale][key] ?? '';
			const otherVal = translations[loc][key] ?? '';

			const primaryPlaceholders = (primaryVal.match(/\{[a-zA-Z0-9_-]+\}/g) ?? []).sort();
			const otherPlaceholders = (otherVal.match(/\{[a-zA-Z0-9_-]+\}/g) ?? []).sort();

			if (primaryPlaceholders.join(',') !== otherPlaceholders.join(',')) {
				problems.push(
					`Key "${key}" placeholder mismatch: [${primaryLocale}]=${JSON.stringify(primaryPlaceholders)} vs [${loc}]=${JSON.stringify(otherPlaceholders)}`
				);
			}
		}
	}

	if (problems.length > 0) {
		console.error(`❌ check:i18n failed with ${problems.length} parity problem(s):`);
		for (const p of problems) {
			console.error(`  - ${p}`);
		}
		process.exit(1);
	}

	console.log(`✅ check:i18n passed: ${locales.join(', ')} (${primaryKeys.size} keys each, 100% parity).`);
}

run().catch((err) => {
	console.error('❌ check:i18n fatal error:', err);
	process.exit(1);
});
