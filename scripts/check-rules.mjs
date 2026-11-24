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

let checksPassed = 0;
function assertRule(condition, description) {
	if (!condition) {
		console.error(`❌ Security Invariant Failed: ${description}`);
		process.exit(1);
	}
	checksPassed++;
}

// 1. Root access closed by default
assertRule(rules['.read'] === undefined, 'Root .read must be undefined');
assertRule(rules['.write'] === undefined, 'Root .write must be undefined');

// 2. Invariants on required collections
const requiredNodes = ['rooms', 'lobby', 'seek', 'users', 'handles', 'leaders', 'myRooms'];
for (const node of requiredNodes) {
	assertRule(Boolean(rules[node]), `Required rules node "${node}" must be present`);
}

// 3. Room enumeration protection & room code validation
assertRule(rules.rooms['.read'] === undefined, 'rooms collection must not allow list enumeration');
const infoWrite = rules.rooms?.$code?.info?.['.write'] || '';
assertRule(
	infoWrite.includes('$code.matches(/^[0-9A-Z]{2,6}$/)'),
	'Room info must enforce 2-6 char alphanumeric room code pattern'
);

// 4. Append-only moves enforcement
const movesSeqWrite = rules.rooms?.$code?.moves?.$seq?.['.write'] || '';
assertRule(
	movesSeqWrite.includes('!data.exists() && newData.exists()'),
	'rooms/$code/moves/$seq must enforce append-only via "!data.exists() && newData.exists()"'
);
assertRule(
	movesSeqWrite.includes("newData.child('by').val() === auth.uid"),
	'Move author must match authenticated UID'
);

// 5. Move payload schema bounds
const payload = rules.rooms?.$code?.moves?.$seq?.payload || {};
assertRule(payload.tick?.['.validate']?.includes('>= 0'), 'Move tick must be non-negative');
assertRule(
	payload.team?.['.validate']?.includes("'west' || newData.val() === 'east'"),
	'Move team must be west or east'
);
assertRule(
	payload.x?.['.validate']?.includes('<= 120'),
	'Move x coordinate must be within grid boundary <= 120'
);
assertRule(
	payload.y?.['.validate']?.includes('<= 60'),
	'Move y coordinate must be within grid boundary <= 60'
);
assertRule(
	payload.buildingType?.['.validate']?.includes('length <= 16'),
	'Building type string length must be bounded'
);
assertRule(
	payload.checksum?.['.validate']?.includes('length <= 32'),
	'State checksum must be bounded'
);

// 6. Presence & Chat validation
const presence = rules.rooms?.$code?.presence?.$uid || {};
assertRule(
	presence['.write']?.includes('$uid === auth.uid'),
	'Presence write must be scoped to $uid === auth.uid'
);
assertRule(
	presence.online?.['.validate']?.includes('isBoolean()'),
	'Presence online flag must be boolean'
);

const chat = rules.rooms?.$code?.chat?.$msgId || {};
assertRule(
	chat['.write']?.includes("newData.child('senderUid').val() === auth.uid"),
	'Chat message sender must match auth.uid'
);
assertRule(
	chat.text?.['.validate']?.includes('length <= 200'),
	'Chat message must be bounded to 200 chars'
);

// 7. Schema lock with $other: false
const nodesEnforcingStrictSchema = [
	{ name: 'rooms/$code/info', node: rules.rooms?.$code?.info },
	{ name: 'rooms/$code/members/$uid', node: rules.rooms?.$code?.members?.$uid },
	{ name: 'rooms/$code/moves/$seq', node: rules.rooms?.$code?.moves?.$seq },
	{ name: 'rooms/$code/moves/$seq/payload', node: rules.rooms?.$code?.moves?.$seq?.payload },
	{ name: 'rooms/$code/presence/$uid', node: rules.rooms?.$code?.presence?.$uid },
	{ name: 'rooms/$code/chat/$msgId', node: rules.rooms?.$code?.chat?.$msgId },
	{ name: 'lobby/$gameId/$code', node: rules.lobby?.$gameId?.$code },
	{ name: 'seek/$gameId/$uid', node: rules.seek?.$gameId?.$uid },
	{ name: 'users/$uid/profile', node: rules.users?.$uid?.profile },
	{ name: 'users/$uid/play', node: rules.users?.$uid?.play },
	{ name: 'leaders/$uid', node: rules.leaders?.$uid }
];

for (const { name, node } of nodesEnforcingStrictSchema) {
	assertRule(
		node?.$other?.['.validate'] === false,
		`Node "${name}" must lock schema with $other: { .validate: false }`
	);
}

// 8. User scoping on play data
const playWrite = rules.users?.$uid?.play?.['.write'] || '';
assertRule(
	playWrite.includes('$uid === auth.uid'),
	'users/$uid/play must be scoped to $uid === auth.uid'
);

// 9. IndexOn for leaders
const leadersIndex = rules.leaders?.['.indexOn'];
assertRule(
	Array.isArray(leadersIndex) && leadersIndex.includes('score'),
	'leaders must have ".indexOn" including "score"'
);

// 10. Handle uniqueness validation
const handleWrite = rules.handles?.$handle?.['.write'] || '';
assertRule(
	handleWrite.includes('$handle.matches(/^[a-z0-9_]{3,20}$/)'),
	'Handle must follow regex pattern /^[a-z0-9_]{3,20}$/'
);

console.log(
	`✅ check-rules passed: all ${checksPassed} security rules invariants and anti-cheat constraints verified.`
);
