import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

const BUILDING_RAW_FIELDS = new Set(['ulum', 'ufoo']);
const UNIT_RAW_FIELDS = new Set(['umvs', 'ubba', 'uabi', 'uabs']);
const USED_ABILITY_CODES = new Set([
	'AOre',
	'AOcr',
	'ACct',
	'A03P',
	'A00U',
	'A07M',
	'Ocr1',
	'ACes',
	'ACev',
	'A03U',
	'Eev1',
	'ACce',
	'A00D',
	'ACbh',
	'A026',
	'A02X',
	'A03S',
	'Aspo',
	'ACvs',
	'A07J',
	'A05T',
	'Afra',
	'A070',
	'A043',
	'ANth',
	'AEah',
	'A00C',
	'ACpv',
	'A031',
	'ANpi',
	'Apxf',
	'Ablo',
	'A08W',
	'A016',
	'Aslo',
	'A06V',
	'Acrs',
	'A05O',
	'Ahea',
	'A0A8',
	'A00Y',
	'Ainf',
	'A01A',
	'A06H',
	'A07A',
	'A02I',
	'A09T',
	'A0AH',
	'A08U',
	'A01X',
	'A06S',
	'A0AK',
	'A082',
	'A083',
	'A05D',
	'A09E',
	'A00B',
	'ACac',
	'A00T',
	'AHad',
	'A01F',
	'A07H',
	'A09Y',
	'A02N',
	'A05R',
	'A00L',
	'A073',
	'A034',
	'Acan',
	'A00K',
	'Aply',
	'A08L',
	'Acyc',
	'A01G',
	'Aban',
	'A05J',
	'Amsh',
	'A03H',
	'A09P',
	'Adid',
	'Adis',
	'Acmg',
	'A0A9',
	'A07R',
	'A049'
]);

function pruneUnusedGameDataPlugin() {
	return {
		name: 'prune-unused-wc3-raw-fields',
		enforce: 'pre' as const,
		transform(code: string, id: string) {
			if (process.env.VITEST) return null;
			const norm = id.replace(/\\/g, '/');
			const isBuildings = norm.endsWith('/src/lib/data/buildings.json');
			const isUnits = norm.endsWith('/src/lib/data/units.json');
			if (!isBuildings && !isUnits) {
				return null;
			}
			const parsed = JSON.parse(code) as Array<Record<string, unknown>>;
			const slim = parsed.map((entry) => {
				const out: Record<string, unknown> = { ...entry };
				if (isBuildings) {
					delete out.building;
					delete out.gold;
					delete out.upgrade_extra_cost;
					if (out.upgrade_from === null) delete out.upgrade_from;
					if (out.armor === 5) delete out.armor;
					if (out.armor_type === 'fort') delete out.armor_type;
					if (out.attack_type === 'normal') delete out.attack_type;
				}
				if (isUnits) {
					delete out.base_unit;
					delete out.move_type;
					delete out.gold_cost;
					if (out.damage_dice === 1) delete out.damage_dice;
					if (typeof out.cooldown === 'number') {
						out.cooldown = Math.round(out.cooldown * 1000) / 1000;
					}
				}
				if (out.unit === '') delete out.unit;
				if (out.lumber_cost === 0) delete out.lumber_cost;
				for (const nk of [
					'attack_type',
					'damage_base',
					'damage_dice',
					'damage_sides',
					'cooldown',
					'range',
					'move_type',
					'race',
					'specialType',
					'building'
				]) {
					if (out[nk] === null) delete out[nk];
				}
				if (out.flying === false) delete out.flying;
				if (out.raw_fields && typeof out.raw_fields === 'object') {
					const rawFields = out.raw_fields as Record<string, unknown>;
					if (isBuildings && typeof rawFields.ulum === 'number' && rawFields.ulum > 0) {
						out.lumber_cost = rawFields.ulum;
					}
					if (isUnits) {
						const maxM = Number(rawFields.umpm || 0);
						if (maxM > 0) {
							out.maxMana = maxM;
							if (rawFields.umpi !== undefined && Number(rawFields.umpi) !== maxM) {
								out.mana = Number(rawFields.umpi);
							}
							const mr = Number(rawFields.umpr || 0);
							if (mr > 0) out.manaRegen = mr;
						}
						if (rawFields.ua1g) {
							const canHitAir = String(rawFields.ua1g).toLowerCase().includes('air');
							if (canHitAir || Boolean(out.flying) || Number(out.range || 0) > 120) {
								out.canHitAir = canHitAir;
							}
						}
					}
					const allowed = isBuildings ? BUILDING_RAW_FIELDS : UNIT_RAW_FIELDS;
					const kept: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(rawFields)) {
						if (!allowed.has(k)) continue;
						if (isBuildings && k === 'ulum') continue;
						if (isUnits && k === 'umvs' && Number(v) < 320) continue;
						if (isUnits && (k === 'uabi' || k === 'uabs')) {
							const filtered = String(v)
								.split(',')
								.map((s) => s.trim())
								.filter((c) => USED_ABILITY_CODES.has(c))
								.join(',');
							if (!filtered) continue;
							kept[k] = filtered;
							continue;
						}
						if (v === '' || v === null || v === undefined) continue;
						if (k === 'ufoo' && Number(v) === 0) continue;
						kept[k] = v;
					}
					if (Object.keys(kept).length > 0) {
						out.raw_fields = kept;
					} else {
						delete out.raw_fields;
					}
				}
				return out;
			});
			return { code: JSON.stringify(slim), map: null };
		}
	};
}

export function getInlineScriptHashes(): `sha256-${string}`[] {
	const htmlPath = path.resolve(__dirname, 'src/app.html');
	if (!existsSync(htmlPath)) return [];
	const html = readFileSync(htmlPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
	const matches = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
	return matches.map((m) => {
		const body = (m[1] ?? '').replace(/\r\n?/g, '\n');
		return `sha256-${createHash('sha256').update(body).digest('base64')}` as `sha256-${string}`;
	});
}

export default defineConfig(({ mode }) => ({
	build: {
		target: 'esnext'
	},
	server: {
		port: 5174,
		strictPort: true
	},
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, './src/lib')
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		maxWorkers: 2,
		minWorkers: 1,
		expect: {
			requireAssertions: true
		}
	},
	plugins: [
		pruneUnusedGameDataPlugin(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: '404.html',
				precompress: false,
				strict: true
			}),
			paths: {
				base: (process.env.BASE_PATH ?? (mode === 'production' ? '/islands-of-nonsense' : '')) as
					'' | `/${string}`,
				relative: false,
				origin: process.env.BASE_PATH === '' ? 'http://localhost' : 'https://alik532ua.github.io'
			},
			version: {
				pollInterval: 60000
			},
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': [
						'self',
						...getInlineScriptHashes(),
						'https://*.firebasedatabase.app',
						'https://*.firebaseio.com',
						...(mode === 'production'
							? ([] as const)
							: (['http://127.0.0.1:9012', 'http://localhost:9012'] as const))
					],
					'style-src': ['self', 'unsafe-inline'],
					'font-src': ['self', 'data:'],
					'img-src': ['self', 'data:', 'blob:'],
					'connect-src': [
						'self',
						'https://api.country.is',
						'https://*.firebasedatabase.app',
						'wss://*.firebasedatabase.app',
						'https://*.firebaseio.com',
						'wss://*.firebaseio.com',
						'https://identitytoolkit.googleapis.com',
						'https://securetoken.googleapis.com',
						...(mode === 'production'
							? ([] as const)
							: ([
									'http://127.0.0.1:9012',
									'ws://127.0.0.1:9012',
									'http://127.0.0.1:9111',
									'http://localhost:9012',
									'ws://localhost:9012',
									'http://localhost:9111'
								] as const))
					],
					'worker-src': ['self', 'blob:'],
					'frame-src': [
						'self',
						'https://*.firebasedatabase.app',
						'https://*.firebaseio.com',
						...(mode === 'production'
							? ([] as const)
							: (['http://127.0.0.1:9012', 'http://localhost:9012'] as const))
					],
					'object-src': ['none'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'form-action': ['none']
				}
			}
		})
	]
}));
