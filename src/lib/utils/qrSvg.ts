/**
 * Compact ISO-18004 Byte-mode QR Code generator (ECC Level L, Versions 1..6)
 * outputting an SVG `<path d="..." />` string without external dependencies.
 */

const VERSIONS: readonly [number, number, number, number, number, number[]][] = [
	[1, 21, 19, 7, 1, []],
	[2, 25, 34, 10, 1, [6, 18]],
	[3, 29, 55, 15, 1, [6, 22]],
	[4, 33, 80, 20, 1, [6, 26]],
	[5, 37, 108, 26, 1, [6, 30]],
	[6, 41, 68, 18, 2, [6, 34]]
];

type QrSpec = {
	version: number;
	size: number;
	dataPerBlock: number;
	eccPerBlock: number;
	blocks: number;
	align: number[];
};
const toSpec = (t: (typeof VERSIONS)[number]): QrSpec => ({
	version: t[0],
	size: t[1],
	dataPerBlock: t[2],
	eccPerBlock: t[3],
	blocks: t[4],
	align: t[5]
});

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		GF_EXP[i] = x;
		GF_LOG[x] = i;
		x <<= 1;
		if (x & 0x100) x ^= 0x11d;
	}
	for (let i = 255; i < 512; i++) {
		GF_EXP[i] = GF_EXP[i - 255];
	}
})();

function gfMul(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) {
		const next = new Uint8Array(poly.length + 1);
		const factor = GF_EXP[i];
		for (let j = 0; j < poly.length; j++) {
			next[j] ^= poly[j];
			next[j + 1] ^= gfMul(poly[j], factor);
		}
		poly = next;
	}
	return poly;
}

function rsComputeEcc(data: Uint8Array, eccLen: number): Uint8Array {
	const gen = rsGeneratorPoly(eccLen);
	const buf = new Uint8Array(data.length + eccLen);
	buf.set(data, 0);
	for (let i = 0; i < data.length; i++) {
		const coef = buf[i];
		if (coef !== 0) {
			for (let j = 1; j < gen.length; j++) {
				buf[i + j] ^= gfMul(gen[j], coef);
			}
		}
	}
	return buf.slice(data.length);
}

function encodeDataCodewords(bytes: Uint8Array, spec: QrSpec): number[] {
	const totalData = spec.dataPerBlock * spec.blocks;
	const bits: number[] = [];
	const pushBits = (val: number, len: number) => {
		for (let i = len - 1; i >= 0; i--) {
			bits.push((val >>> i) & 1);
		}
	};

	// Mode indicator: Byte (0100), count (8 bits for V1..V9)
	pushBits(0b0100, 4);
	pushBits(bytes.length, 8);
	for (const b of bytes) pushBits(b, 8);

	const maxBits = totalData * 8;
	const terminatorLen = Math.min(4, maxBits - bits.length);
	pushBits(0, terminatorLen);
	while (bits.length % 8 !== 0) bits.push(0);

	const out: number[] = [];
	for (let i = 0; i < bits.length; i += 8) {
		let v = 0;
		for (let b = 0; b < 8; b++) v = (v << 1) | bits[i + b];
		out.push(v);
	}
	let padIdx = 0;
	while (out.length < totalData) {
		out.push(padIdx % 2 === 0 ? 0xec : 0x11);
		padIdx++;
	}

	const dataBlocks: Uint8Array[] = [];
	const eccBlocks: Uint8Array[] = [];
	for (let b = 0; b < spec.blocks; b++) {
		const slice = new Uint8Array(out.slice(b * spec.dataPerBlock, (b + 1) * spec.dataPerBlock));
		dataBlocks.push(slice);
		eccBlocks.push(rsComputeEcc(slice, spec.eccPerBlock));
	}

	const interleaved: number[] = [];
	for (let i = 0; i < spec.dataPerBlock; i++) {
		for (const blk of dataBlocks) interleaved.push(blk[i]);
	}
	for (let i = 0; i < spec.eccPerBlock; i++) {
		for (const blk of eccBlocks) interleaved.push(blk[i]);
	}
	return interleaved;
}

function formatBits(maskPattern: number): number {
	// ECC L = 01
	const data = (0b01 << 3) | (maskPattern & 7);
	let rem = data << 10;
	const poly = 0x537;
	for (let bit = 14; bit >= 10; bit--) {
		if ((rem >>> bit) & 1) {
			rem ^= poly << (bit - 10);
		}
	}
	return ((data << 10) | rem) ^ 0x5412;
}

function buildMatrix(spec: QrSpec, codewords: number[]): Uint8Array[] {
	const n = spec.size;
	const grid = Array.from({ length: n }, () => new Uint8Array(n));
	const reserved = Array.from({ length: n }, () => new Uint8Array(n));

	const setReserved = (r: number, c: number, dark: boolean) => {
		if (r < 0 || r >= n || c < 0 || c >= n) return;
		grid[r][c] = dark ? 1 : 0;
		reserved[r][c] = 1;
	};

	const placeFinder = (top: number, left: number) => {
		for (let dr = -1; dr <= 7; dr++) {
			for (let dc = -1; dc <= 7; dc++) {
				const r = top + dr;
				const c = left + dc;
				if (r < 0 || r >= n || c < 0 || c >= n) continue;
				const inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
				const dark =
					inBox &&
					(dr === 0 ||
						dr === 6 ||
						dc === 0 ||
						dc === 6 ||
						(dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
				setReserved(r, c, dark);
			}
		}
	};

	placeFinder(0, 0);
	placeFinder(0, n - 7);
	placeFinder(n - 7, 0);

	// Alignment patterns
	for (const ar of spec.align) {
		for (const ac of spec.align) {
			if (reserved[ar][ac]) continue;
			for (let dr = -2; dr <= 2; dr++) {
				for (let dc = -2; dc <= 2; dc++) {
					const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
					setReserved(ar + dr, ac + dc, dark);
				}
			}
		}
	}

	// Timing patterns
	for (let i = 8; i < n - 8; i++) {
		if (!reserved[6][i]) setReserved(6, i, i % 2 === 0);
		if (!reserved[i][6]) setReserved(i, 6, i % 2 === 0);
	}

	// Reserve format info + dark module
	setReserved(4 * spec.version + 9, 8, true);
	for (let i = 0; i < 9; i++) {
		if (i !== 6) reserved[8][i] = 1;
		if (i !== 6) reserved[i][8] = 1;
	}
	for (let i = n - 8; i < n; i++) reserved[8][i] = 1;
	for (let i = n - 7; i < n; i++) reserved[i][8] = 1;

	// Place data bits zig-zag upward/downward
	const allBits: number[] = [];
	for (const cw of codewords) {
		for (let b = 7; b >= 0; b--) allBits.push((cw >>> b) & 1);
	}

	let bitIdx = 0;
	let upward = true;
	for (let right = n - 1; right > 0; right -= 2) {
		if (right === 6) right = 5;
		for (let step = 0; step < n; step++) {
			const r = upward ? n - 1 - step : step;
			for (const c of [right, right - 1]) {
				if (!reserved[r][c]) {
					grid[r][c] = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
				}
			}
		}
		upward = !upward;
	}

	const MASK_FNS: ReadonlyArray<(r: number, c: number) => boolean> = [
		(r, c) => (r + c) % 2 === 0,
		(r) => r % 2 === 0,
		(_, c) => c % 3 === 0,
		(r, c) => (r + c) % 3 === 0,
		(r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
		(r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
		(r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
		(r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
	];

	const applyMask = (src: Uint8Array[], maskId: number): Uint8Array[] => {
		const masked = src.map((row) => new Uint8Array(row));
		const fn = MASK_FNS[maskId];
		for (let r = 0; r < n; r++) {
			for (let c = 0; c < n; c++) {
				if (!reserved[r][c] && fn(r, c)) masked[r][c] ^= 1;
			}
		}
		const fmt = formatBits(maskId);
		for (let i = 0; i < 15; i++) {
			const dark = ((fmt >>> i) & 1) === 1 ? 1 : 0;
			masked[i < 6 ? i : i < 8 ? i + 1 : n - 15 + i][8] = dark;
			masked[8][i < 8 ? n - i - 1 : i < 9 ? 15 - i : 15 - i - 1] = dark;
		}
		return masked;
	};

	const scoreMatrix = (m: Uint8Array[]): number => {
		let penalty = 0;
		for (const byCol of [false, true]) {
			for (let a = 0; a < n; a++) {
				let run = 1;
				for (let b = 1; b < n; b++) {
					const same = byCol ? m[b][a] === m[b - 1][a] : m[a][b] === m[a][b - 1];
					if (same) run++;
					else {
						if (run >= 5) penalty += run - 2;
						run = 1;
					}
				}
				if (run >= 5) penalty += run - 2;
			}
		}
		for (let r = 0; r < n - 1; r++) {
			for (let c = 0; c < n - 1; c++) {
				const v = m[r][c];
				if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) penalty += 3;
			}
		}
		return penalty;
	};

	let best = applyMask(grid, 0);
	let bestScore = scoreMatrix(best);
	for (let m = 1; m < 8; m++) {
		const cand = applyMask(grid, m);
		const sc = scoreMatrix(cand);
		if (sc < bestScore) {
			bestScore = sc;
			best = cand;
		}
	}
	return best;
}

export interface QrSvgResult {
	size: number;
	version: number;
	path: string;
}

export function generateQrSvgPath(text: string, margin = 2): QrSvgResult {
	const bytes = new TextEncoder().encode(text);
	const spec = toSpec(
		VERSIONS.find((v) => v[2] * v[4] - 2 >= bytes.length) ?? VERSIONS[VERSIONS.length - 1]
	);
	const capped =
		bytes.length > spec.dataPerBlock * spec.blocks - 2
			? bytes.slice(0, spec.dataPerBlock * spec.blocks - 2)
			: bytes;
	const codewords = encodeDataCodewords(capped, spec);
	const matrix = buildMatrix(spec, codewords);

	const parts: string[] = [];
	const n = spec.size;
	for (let r = 0; r < n; r++) {
		let c = 0;
		while (c < n) {
			if (matrix[r][c] === 1) {
				const start = c;
				while (c < n && matrix[r][c] === 1) c++;
				const w = c - start;
				parts.push(`M${start + margin},${r + margin}h${w}v1h-${w}z`);
			} else {
				c++;
			}
		}
	}

	return {
		size: n + margin * 2,
		version: spec.version,
		path: parts.join('')
	};
}
