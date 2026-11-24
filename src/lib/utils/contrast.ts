/**
 * Контраст за стандартом WCAG 2.x — канонічна арифметика для тестів і тем.
 *
 * Базується на рішенні з teatralo4ka.odesa.ua та Slovko.
 */

export type Rgb = [number, number, number];

export const AA_NORMAL = 4.5;
export const AA_LARGE = 3.0;

const NAMED: Record<string, Rgb> = {
	white: [255, 255, 255],
	black: [0, 0, 0]
};

/** Розбирає `#abc`, `#aabbcc`, `rgb(...)`, `rgba(...)`, `white`, `black`. Інше — `null`. */
export function parseColor(value: string): Rgb | null {
	if (!value) return null;
	const v = value.trim().toLowerCase();
	if (v in NAMED) return NAMED[v];

	// Якщо це лінійний градієнт, спробувати взяти перший колір або пропустити
	if (v.startsWith('linear-gradient(')) {
		const match = v.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})|rgba?\([^)]+\)/i);
		if (match) return parseColor(match[0]);
		return null;
	}

	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
	if (hex) {
		const h = hex[1];
		const full =
			h.length === 3
				? h
						.split('')
						.map((c) => c + c)
						.join('')
				: h;
		return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
	}

	const rgb = /^rgba?\(([^)]+)\)$/.exec(v);
	if (rgb) {
		const parts = rgb[1]
			.split(/[\s,/]+/)
			.filter(Boolean)
			.map(Number);
		// Напівпрозоре (< 0.9) не розв'язується без знання шару під ним
		if (parts.length >= 4 && parts[3] < 0.9) return null;
		if (parts.slice(0, 3).some(Number.isNaN)) return null;
		return parts.slice(0, 3) as Rgb;
	}

	return null;
}

/** Відносна яскравість за WCAG 2.x, від 0 (чорний) до 1 (білий). */
export function luminance([r, g, b]: Rgb): number {
	const f = (val: number) => {
		const c = val / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Коефіцієнт контрасту за WCAG 2.x, від 1 до 21. */
export function contrast(a: Rgb, b: Rgb): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}
