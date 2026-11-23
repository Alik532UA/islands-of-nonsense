import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rulesPath = resolve(import.meta.dirname, '../database.rules.json');

if (!existsSync(rulesPath)) {
	console.error('❌ database.rules.json file is missing!');
	process.exit(1);
}

const raw = readFileSync(rulesPath, 'utf8');
let parsed;
try {
	parsed = JSON.parse(raw);
} catch (err) {
	console.error('❌ database.rules.json contains invalid JSON:', err);
	process.exit(1);
}

const rules = parsed.rules;
if (!rules) {
	console.error('❌ database.rules.json is missing top-level "rules" object!');
	process.exit(1);
}

// Invariants
const requiredNodes = ['rooms', 'lobby', 'seek', 'users', 'handles', 'leaders', 'myRooms'];
for (const node of requiredNodes) {
	if (!rules[node]) {
		console.error(`❌ Required rules node "${node}" is missing!`);
		process.exit(1);
	}
}

// Check append-only on moves
const movesSeqWrite = rules.rooms?.$code?.moves?.$seq?.['.write'];
if (!movesSeqWrite || !movesSeqWrite.includes('!data.exists() && newData.exists()')) {
	console.error('❌ rooms/$code/moves/$seq must enforce append-only via "!data.exists() && newData.exists()"!');
	process.exit(1);
}

// Check user scoping on play data
const playWrite = rules.users?.$uid?.play?.['.write'];
if (!playWrite || !playWrite.includes('$uid === auth.uid')) {
	console.error('❌ users/$uid/play must be scoped to $uid === auth.uid!');
	process.exit(1);
}

// Check indexOn for leaders
const leadersIndex = rules.leaders?.['.indexOn'];
if (!Array.isArray(leadersIndex) || !leadersIndex.includes('score')) {
	console.error('❌ leaders must have ".indexOn" including "score"!');
	process.exit(1);
}

console.log('✅ check-rules passed: all security rules and invariants verified.');
