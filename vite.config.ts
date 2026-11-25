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

const BUILDING_RAW_FIELDS = new Set(['ulum', 'ubld', 'ufoo']);
const UNIT_RAW_FIELDS = new Set(['ua1g', 'umpm', 'umpi', 'umpr', 'umvs', 'ubba', 'uabi', 'uabs']);

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
				}
				if (isUnits) {
					delete out.base_unit;
				}
				for (const nk of [
					'damage_base',
					'damage_dice',
					'damage_sides',
					'cooldown',
					'range',
					'move_type',
					'building'
				]) {
					if (out[nk] === null) delete out[nk];
				}
				if (out.flying === false) delete out.flying;
				if (out.raw_fields && typeof out.raw_fields === 'object') {
					const allowed = isBuildings ? BUILDING_RAW_FIELDS : UNIT_RAW_FIELDS;
					const kept: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(out.raw_fields as Record<string, unknown>)) {
						if (!allowed.has(k)) continue;
						if (v === '' || v === null || v === undefined) continue;
						if ((k === 'umpm' || k === 'umpr' || k === 'ulum' || k === 'ufoo') && Number(v) === 0)
							continue;
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
