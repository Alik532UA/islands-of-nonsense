import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const buildIndex = resolve(rootDir, 'build/index.html');

if (!existsSync(buildIndex)) {
	console.error('❌ build/index.html not found! Run npm run build first.');
	process.exit(1);
}

const html = readFileSync(buildIndex, 'utf8');
if (!html.includes('<title>')) {
	console.error('❌ build/index.html is missing <title> tag.');
	process.exit(1);
}

console.log('✅ check-build passed: build directory valid.');
