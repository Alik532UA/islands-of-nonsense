import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Procedural Generator for PWA Icons and Favicons using the orange Lucide Castle icon.
 * Outputs:
 * - static/assets/icon-192.png (192x192, any)
 * - static/assets/icon-512.png (512x512, any)
 * - static/assets/icon-maskable-512.png (512x512, maskable)
 * - static/favicon.png (64x64, any)
 * - static/favicon.svg (SVG vector)
 * - src/lib/assets/favicon.svg (SvelteKit asset import)
 */

function crc32(buf) {
	let table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[i] = c;
	}
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
	const len = data.length;
	const chunk = Buffer.alloc(12 + len);
	chunk.writeUInt32BE(len, 0);
	chunk.write(type, 4, 4, 'ascii');
	data.copy(chunk, 8);
	const typeAndData = chunk.subarray(4, 8 + len);
	const crc = crc32(typeAndData);
	chunk.writeUInt32BE(crc, 8 + len);
	return chunk;
}

function createPng(width, height, getPixel) {
	const scanlines = Buffer.alloc(height * (1 + width * 4));
	let offset = 0;
	for (let y = 0; y < height; y++) {
		scanlines[offset++] = 0; // filter None
		for (let x = 0; x < width; x++) {
			const [r, g, b, a] = getPixel(x, y, width, height);
			scanlines[offset++] = r;
			scanlines[offset++] = g;
			scanlines[offset++] = b;
			scanlines[offset++] = a;
		}
	}

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // 8-bit
	ihdr[9] = 6; // RGBA
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const idat = zlib.deflateSync(scanlines);
	const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const ihdrChunk = makeChunk('IHDR', ihdr);
	const idatChunk = makeChunk('IDAT', idat);
	const iendChunk = makeChunk('IEND', Buffer.alloc(0));

	return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - x1, py - y1);
	let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function distToArc(px, py, cx, cy, r, condition) {
	if (condition(px, py)) {
		return Math.abs(Math.hypot(px - cx, py - cy) - r);
	}
	return Infinity;
}

/**
 * Exact Signed Distance Field to the 24x24 Lucide Castle vector strokes.
 */
function distToLucideCastle(x, y) {
	return Math.min(
		// 1. Central battlements top cutouts
		distToSegment(x, y, 10, 5, 10, 3),
		distToSegment(x, y, 14, 5, 14, 3),
		// 2. Center keep side walls
		distToSegment(x, y, 18, 3, 18, 11),
		distToSegment(x, y, 6, 3, 6, 11),
		// 3. Battlement floor
		distToSegment(x, y, 6, 5, 18, 5),
		// 4. Main parapet horizontal line
		distToSegment(x, y, 2, 11, 22, 11),
		// 5. Outer castle walls and bottom with rounded corners (r=2)
		distToSegment(x, y, 22, 9, 22, 19),
		distToArc(x, y, 20, 19, 2, (px, py) => px >= 20 && py >= 19),
		distToSegment(x, y, 4, 21, 20, 21),
		distToArc(x, y, 4, 19, 2, (px, py) => px <= 4 && py >= 19),
		distToSegment(x, y, 2, 9, 2, 19),
		// 6. Arched gate / portcullis (r=3, center 12, 18)
		distToSegment(x, y, 15, 18, 15, 21),
		distToArc(x, y, 12, 18, 3, (px, py) => py <= 18),
		distToSegment(x, y, 9, 18, 9, 21)
	);
}

/**
 * Distance to 2D rounded rectangle (squircle).
 */
function distToRoundedBox(px, py, hx, hy, r) {
	const qx = Math.abs(px) - hx + r;
	const qy = Math.abs(py) - hy + r;
	return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

/**
 * Calculates pixel color for Lucide Castle with anti-aliasing.
 */
function getOrangeCastlePixel(x, y, size, maskable) {
	const cx = size / 2;
	const cy = size / 2;

	// Theme colors
	const bgR = 19, bgG = 24, bgB = 38; // #131826 (Game card surface)
	const orangeR = 249, orangeG = 115, orangeB = 22; // #f97316 (Vibrant Orange)
	const borderR = 234, borderG = 88, borderB = 12; // #ea580c (Border Orange)

	// Scale & view transforms
	// In maskable icon, keep inside central 80% circle (safe zone: scale 0.62)
	// In standard icons, scale to 0.72 of icon
	const scale = maskable ? 0.62 : 0.72;
	const castleSize = size * scale;

	const px = x - cx;
	const py = y - cy;

	// Background geometry
	let baseAlpha = 1.0;
	let hasBorder = false;

	if (maskable) {
		// Solid background covering 100% of maskable viewport (required by PWA spec)
		baseAlpha = 1.0;
	} else {
		// Rounded squircle badge for 'any' icons
		const hx = (size / 2) * 0.90;
		const hy = (size / 2) * 0.90;
		const cornerR = size * 0.22;
		const dBox = distToRoundedBox(px, py, hx, hy, cornerR);

		if (dBox > 1.0) {
			return [0, 0, 0, 0]; // Transparent outside badge
		} else if (dBox > 0) {
			baseAlpha = 1.0 - dBox;
		}

		if (dBox >= -size * 0.035 && dBox <= 0.5) {
			hasBorder = true;
		}
	}

	// Transform pixel to 24x24 Lucide icon coordinates
	const vx = (px / castleSize + 0.5) * 24;
	const vy = (py / castleSize + 0.5) * 24;

	// Subpixel supersampling (2x2 grid) for anti-aliasing
	const subOffsets = [-0.25, 0.25];
	const subStepV = 24 / castleSize;
	let strokeHits = 0;
	let isInsideGate = false;

	if (vx >= 9 && vx <= 15 && vy >= 15 && vy <= 21) {
		isInsideGate = true;
	}

	for (const sy of subOffsets) {
		for (const sx of subOffsets) {
			const svx = vx + sx * subStepV;
			const svy = vy + sy * subStepV;
			const dist = distToLucideCastle(svx, svy);
			// Stroke radius is 1.0 (since stroke-width is 2.0 in 24x24)
			const strokeRad = 1.0;
			const aaEdge = (subStepV * 0.6);
			if (dist <= strokeRad - aaEdge) {
				strokeHits += 1;
			} else if (dist <= strokeRad + aaEdge) {
				strokeHits += Math.max(0, Math.min(1, 0.5 + (strokeRad - dist) / (2 * aaEdge)));
			}
		}
	}

	const strokeCoverage = strokeHits / 4;

	if (strokeCoverage > 0) {
		// Blend orange stroke over background
		const r = Math.round(bgR + (orangeR - bgR) * strokeCoverage);
		const g = Math.round(bgG + (orangeG - bgG) * strokeCoverage);
		const b = Math.round(bgB + (orangeB - bgB) * strokeCoverage);
		const a = Math.round(baseAlpha * (0.85 + 0.15 * strokeCoverage) * 255);
		return [r, g, b, a];
	}

	// Warm subtle gate glow inside portcullis arch
	if (isInsideGate && vy >= 15.5 && Math.hypot(vx - 12, Math.min(vy, 18) - 18) <= 3) {
		const glowR = Math.round(bgR * 0.6 + orangeR * 0.4);
		const glowG = Math.round(bgG * 0.6 + orangeG * 0.4);
		const glowB = Math.round(bgB * 0.6 + orangeB * 0.4);
		return [glowR, glowG, glowB, Math.round(baseAlpha * 255)];
	}

	if (hasBorder) {
		return [borderR, borderG, borderB, Math.round(baseAlpha * 255)];
	}

	return [bgR, bgG, bgB, Math.round(baseAlpha * 255)];
}

const assetsDir = path.resolve('static/assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

console.log('🏰 Generating Orange Lucide Castle PWA Icons & Favicon...');

// 1. icon-192.png (PWA standard any)
const icon192 = createPng(192, 192, (x, y, s) => getOrangeCastlePixel(x, y, s, false));
fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), icon192);
console.log('✅ Created static/assets/icon-192.png (192x192, any)');

// 2. icon-512.png (PWA high-res any)
const icon512 = createPng(512, 512, (x, y, s) => getOrangeCastlePixel(x, y, s, false));
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), icon512);
console.log('✅ Created static/assets/icon-512.png (512x512, any)');

// 3. icon-maskable-512.png (PWA adaptive maskable)
const iconMaskable512 = createPng(512, 512, (x, y, s) => getOrangeCastlePixel(x, y, s, true));
fs.writeFileSync(path.join(assetsDir, 'icon-maskable-512.png'), iconMaskable512);
console.log('✅ Created static/assets/icon-maskable-512.png (512x512, maskable)');

// 4. favicon.png (64x64 raster)
const favicon64 = createPng(64, 64, (x, y, s) => getOrangeCastlePixel(x, y, s, false));
fs.writeFileSync(path.resolve('static/favicon.png'), favicon64);
console.log('✅ Created static/favicon.png (64x64)');

// 5. SVG Favicons (crisp scalable vector)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#131826" />
  <g transform="translate(4, 4)" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 5V3" />
    <path d="M14 5V3" />
    <path d="M15 21v-3a3 3 0 0 0-6 0v3" />
    <path d="M18 3v8" />
    <path d="M18 5H6" />
    <path d="M22 11H2" />
    <path d="M22 9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9" />
    <path d="M6 3v8" />
  </g>
</svg>
`;

fs.writeFileSync(path.resolve('static/favicon.svg'), svgContent);
console.log('✅ Created static/favicon.svg');

const libAssetsDir = path.resolve('src/lib/assets');
if (!fs.existsSync(libAssetsDir)) fs.mkdirSync(libAssetsDir, { recursive: true });
fs.writeFileSync(path.join(libAssetsDir, 'favicon.svg'), svgContent);
console.log('✅ Updated src/lib/assets/favicon.svg');
