import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

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

/**
 * Procedurally draws a Castle Fight fortress emblem.
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {boolean} maskable
 */
function getCastlePixel(x, y, size, maskable) {
	// Normalized coordinates (-1 to 1)
	const cx = size / 2;
	const cy = size / 2;
	const scale = maskable ? 0.65 : 0.85;
	const nx = (x - cx) / (cx * scale);
	const ny = (y - cy) / (cy * scale);

	const dist = Math.sqrt(nx * nx + ny * ny);

	// Background color: Deep Slate / Night Sky
	const bgR = 11,
		bgG = 15,
		bgB = 25;

	// Circular shield background
	if (dist > 1.05) {
		if (maskable) {
			// Solid background extending to all edges for maskable safe area
			return [bgR, bgG, bgB, 255];
		}
		return [0, 0, 0, 0]; // Transparent outer padding for 'any' icon
	}

	// Golden ring border (dist between 0.95 and 1.05)
	if (dist >= 0.92 && dist <= 1.05) {
		const goldFactor = (1.05 - dist) / 0.13;
		const r = Math.round(217 + (245 - 217) * goldFactor);
		const g = Math.round(119 + (158 - 119) * goldFactor);
		const b = Math.round(6 + (11 - 6) * goldFactor);
		return [r, g, b, 255];
	}

	// Inner shield gradient
	const innerGrad = Math.max(0, 1 - dist * 0.8);
	let pr = Math.round(15 + 25 * innerGrad);
	let pg = Math.round(23 + 30 * innerGrad);
	let pb = Math.round(42 + 50 * innerGrad);

	// Castle geometry in normalized space:
	// Base wall: nx in [-0.55, 0.55], ny in [-0.2, 0.6]
	const inBaseWall = nx >= -0.55 && nx <= 0.55 && ny >= -0.15 && ny <= 0.55;

	// Left Tower: nx in [-0.55, -0.3], ny in [-0.5, 0.55]
	const inLeftTower = nx >= -0.55 && nx <= -0.28 && ny >= -0.5 && ny <= 0.55;

	// Right Tower: nx in [0.28, 0.55], ny in [-0.5, 0.55]
	const inRightTower = nx >= 0.28 && nx <= 0.55 && ny >= -0.5 && ny <= 0.55;

	// Center Keep / Main Tower: nx in [-0.22, 0.22], ny in [-0.65, 0.55]
	const inCenterKeep = nx >= -0.22 && nx <= 0.22 && ny >= -0.65 && ny <= 0.55;

	// Crenellations (battlements) cutouts
	const isLeftCrenel = inLeftTower && ny < -0.42 && Math.abs(nx - -0.415) < 0.045;
	const isRightCrenel = inRightTower && ny < -0.42 && Math.abs(nx - 0.415) < 0.045;
	const isCenterCrenel1 = inCenterKeep && ny < -0.57 && Math.abs(nx - -0.11) < 0.035;
	const isCenterCrenel2 = inCenterKeep && ny < -0.57 && Math.abs(nx - 0.11) < 0.035;

	const isCrenelCutout = isLeftCrenel || isRightCrenel || isCenterCrenel1 || isCenterCrenel2;

	// Arched Portcullis (Gate): nx in [-0.14, 0.14], ny in [0.15, 0.55]
	const inGateRect = nx >= -0.13 && nx <= 0.13 && ny >= 0.2 && ny <= 0.55;
	const inGateArch = nx * nx / (0.13 * 0.13) + (ny - 0.2) * (ny - 0.2) / (0.13 * 0.13) <= 1 && ny <= 0.2;
	const inGate = (inGateRect || inGateArch) && ny >= 0.07;

	// Roof / Spire peak on Center Keep: ny in [-0.85, -0.65], width tapering
	const spireProgress = (-0.65 - ny) / 0.2;
	const inSpire = ny >= -0.85 && ny < -0.65 && Math.abs(nx) <= 0.12 * (1 - spireProgress);

	if (inSpire) {
		// Golden Spire
		return [245, 158, 11, 255];
	}

	if ((inBaseWall || inLeftTower || inRightTower || inCenterKeep) && !isCrenelCutout) {
		if (inGate) {
			// Deep dark glowing gate
			return [10, 10, 18, 255];
		}
		// Castle Stone Color with highlights
		const isCenter = inCenterKeep || Math.abs(nx) < 0.22;
		const stoneBright = isCenter ? 210 : 170;
		const stoneR = stoneBright;
		const stoneG = Math.round(stoneBright * 0.9);
		const stoneB = Math.round(stoneBright * 0.75);

		// Stone wall border lines / edge shading
		const isEdge =
			Math.abs(nx - -0.55) < 0.02 ||
			Math.abs(nx - 0.55) < 0.02 ||
			Math.abs(nx - -0.28) < 0.02 ||
			Math.abs(nx - 0.28) < 0.02;

		if (isEdge) {
			return [Math.round(stoneR * 0.7), Math.round(stoneG * 0.7), Math.round(stoneB * 0.7), 255];
		}

		return [stoneR, stoneG, stoneB, 255];
	}

	// Return inner shield background
	return [pr, pg, pb, 255];
}

const assetsDir = path.resolve('static/assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

console.log('🖼️ Generating PWA Icons...');

const icon192 = createPng(192, 192, (x, y, s) => getCastlePixel(x, y, s, false));
fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), icon192);
console.log('✅ Created static/assets/icon-192.png (192x192, any)');

const icon512 = createPng(512, 512, (x, y, s) => getCastlePixel(x, y, s, false));
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), icon512);
console.log('✅ Created static/assets/icon-512.png (512x512, any)');

const iconMaskable512 = createPng(512, 512, (x, y, s) => getCastlePixel(x, y, s, true));
fs.writeFileSync(path.join(assetsDir, 'icon-maskable-512.png'), iconMaskable512);
console.log('✅ Created static/assets/icon-maskable-512.png (512x512, maskable)');

const favicon64 = createPng(64, 64, (x, y, s) => getCastlePixel(x, y, s, false));
fs.writeFileSync(path.resolve('static/favicon.png'), favicon64);
console.log('✅ Created static/favicon.png (64x64)');
