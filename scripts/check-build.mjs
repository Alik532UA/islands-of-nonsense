import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const buildDir = resolve(rootDir, 'build');
const buildIndex = resolve(buildDir, 'index.html');
const build404 = resolve(buildDir, '404.html');
const buildRobots = resolve(buildDir, 'robots.txt');
const buildSitemap = resolve(buildDir, 'sitemap.xml');

const SITE_ORIGIN = 'https://alik532ua.github.io';
const SITE_BASE = '/islands-of-nonsense';
const FULL_SITE_URL = `${SITE_ORIGIN}${SITE_BASE}`;

// 1. Basic build files check
if (!existsSync(buildIndex)) {
	console.error('❌ build/index.html not found! Run npm run build first.');
	process.exit(1);
}

if (!existsSync(build404)) {
	console.error('❌ build/404.html fallback not found!');
	process.exit(1);
}

if (!existsSync(buildRobots)) {
	console.error('❌ build/robots.txt not found!');
	process.exit(1);
}

const robots = readFileSync(buildRobots, 'utf8');
if (!robots.includes(`Sitemap: ${FULL_SITE_URL}/sitemap.xml`)) {
	console.error(`❌ build/robots.txt is missing Sitemap: ${FULL_SITE_URL}/sitemap.xml`);
	process.exit(1);
}

if (!existsSync(buildSitemap)) {
	console.error('❌ build/sitemap.xml not found! (SEO § 5)');
	process.exit(1);
}

const sitemap = readFileSync(buildSitemap, 'utf8');
if (!sitemap.includes('<urlset') || !sitemap.includes(`<loc>${FULL_SITE_URL}/</loc>`)) {
	console.error(`❌ build/sitemap.xml is invalid or missing root URL ${FULL_SITE_URL}/`);
	process.exit(1);
}

// 2. Scan all HTML files in build/
function getHtmlFiles(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		const full = resolve(dir, entry);
		if (statSync(full).isDirectory()) {
			getHtmlFiles(full, files);
		} else if (entry.endsWith('.html')) {
			files.push(full);
		}
	}
	return files;
}

const htmlFiles = getHtmlFiles(buildDir);
const problems = [];

const SINGLE_OWNER = [
	'canonical',
	'description',
	'og:title',
	'og:description',
	'og:url',
	'og:image',
	'og:type',
	'twitter:card',
	'twitter:title',
	'twitter:description',
	'twitter:image'
];

for (const file of htmlFiles) {
	const rel = relative(buildDir, file).split(sep).join('/');
	const html = readFileSync(file, 'utf8');

	// Check for prerender leak (SEO-v10 § 1.2)
	if (html.includes('sveltekit-prerender')) {
		problems.push(`${rel}: contains "sveltekit-prerender" origin leak`);
	}

	// Check for broken relative url traversal in absolute urls (SEO-v10 § 1.2)
	if (/https?:\/\/[^"'\s<>/]+\.\.?\/|https?:\/\/[^"'\s<>]*\/\.{1,2}\//.test(html)) {
		problems.push(`${rel}: absolute URL contains relative "./" or "../" traversal`);
	}

	// 404 fallback page is exempted from full head checks
	if (rel === '404.html') continue;

	// Single owner tag checks for index.html
	if (rel === 'index.html') {
		if (!html.includes('<title>') || /<title>\s*<\/title>/i.test(html)) {
			problems.push(`${rel}: missing or empty <title> tag`);
		}
		for (const tag of SINGLE_OWNER) {
			const regex =
				tag === 'canonical'
					? /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi
					: new RegExp(`<(?:meta)\\b[^>]*(?:name|property)=["']${tag}["'][^>]*>`, 'gi');
			const count = (html.match(regex) ?? []).length;
			if (count > 1) {
				problems.push(`${rel}: ${tag} appears ${count} times (duplicate metadata)`);
			}
		}
	}
}

if (problems.length > 0) {
	console.error('❌ check-build failed with SEO/GATE problems:');
	for (const p of problems) {
		console.error(`  - ${p}`);
	}
	process.exit(1);
}

console.log('✅ check-build passed: build directory valid (HTML, sitemap, robots, SEO).');
