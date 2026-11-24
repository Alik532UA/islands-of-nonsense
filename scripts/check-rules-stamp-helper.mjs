import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/lib/net/rulesVersion.ts'), 'utf8');
const match = source.match(/RULES_STAMP\s*=\s*'([a-f0-9]+)'/);
if (!match) {
	throw new Error('Could not parse RULES_STAMP from src/lib/net/rulesVersion.ts');
}
export const RULES_STAMP = match[1];
