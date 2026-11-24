#!/usr/bin/env node
/**
 * Budget checker for JavaScript and CSS bundles (PERFORMANCE-v10 § 1, CI-CD-AND-TOOLS-v10 § 1.18).
 * Ensures Castle Fight Web build stays within lightweight budget limits.
 */
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUILD_DIR = process.argv[2] ?? 'build';
const MAX_JS_KB = 550; // Gzip ceiling for total JS across all pages and chunks
const MAX_CSS_KB = 60; // Gzip ceiling for CSS
const MAX_SINGLE_CHUNK_KB = 250; // Max allowed gzip size for any individual JS chunk

if (!existsSync(BUILD_DIR)) {
	console.error(`❌ Build directory "${BUILD_DIR}" not found. Run "npm run build" first.`);
	process.exit(1);
}

const files = [];
function walk(dir) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full);
		} else {
			files.push(full);
		}
	}
}
walk(BUILD_DIR);

let totalJsGzip = 0;
let totalCssGzip = 0;
const chunkDetails = [];

for (const file of files) {
	if (file.endsWith('.js')) {
		const content = readFileSync(file);
		const gzLen = gzipSync(content).length;
		totalJsGzip += gzLen;
		chunkDetails.push({ file, gzKb: gzLen / 1024 });
	} else if (file.endsWith('.css')) {
		const content = readFileSync(file);
		const gzLen = gzipSync(content).length;
		totalCssGzip += gzLen;
	}
}

const totalJsKb = totalJsGzip / 1024;
const totalCssKb = totalCssGzip / 1024;

console.log('📦 Bundle Budget Report (Castle Fight Web):');
console.log(`  Total JS (gzip):  ${totalJsKb.toFixed(1)} KB (Budget: ${MAX_JS_KB} KB)`);
console.log(`  Total CSS (gzip): ${totalCssKb.toFixed(1)} KB (Budget: ${MAX_CSS_KB} KB)`);

chunkDetails.sort((a, b) => b.gzKb - a.gzKb);
if (chunkDetails.length > 0) {
	console.log('\n  Heaviest chunks:');
	chunkDetails.slice(0, 5).forEach((c) => {
		console.log(`    - ${c.file.replace(/\\/g, '/')}: ${c.gzKb.toFixed(1)} KB`);
	});
}

const isSoft = process.env.BUDGET_SOFT === '1' || process.argv.includes('--warn-only');
let failed = false;

if (totalJsKb > MAX_JS_KB) {
	console.error(`\n❌ Total JS exceeds budget (${totalJsKb.toFixed(1)} KB > ${MAX_JS_KB} KB)`);
	failed = true;
}

if (totalCssKb > MAX_CSS_KB) {
	console.error(`\n❌ Total CSS exceeds budget (${totalCssKb.toFixed(1)} KB > ${MAX_CSS_KB} KB)`);
	failed = true;
}

const oversizedChunks = chunkDetails.filter((c) => c.gzKb > MAX_SINGLE_CHUNK_KB);
if (oversizedChunks.length > 0) {
	console.error(`\n❌ Single chunk exceeds limit (${MAX_SINGLE_CHUNK_KB} KB):`);
	for (const chunk of oversizedChunks) {
		console.error(`   - ${chunk.file}: ${chunk.gzKb.toFixed(1)} KB`);
	}
	failed = true;
}

if (failed) {
	if (!isSoft) {
		process.exit(1);
	} else {
		console.warn('\n⚠️ Budget exceeded but running in soft/warn-only mode.');
	}
} else {
	console.log('\n✅ Bundle budget passed successfully.');
}
