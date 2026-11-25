import type { Graphics } from 'pixi.js';

export type FillStyle = { color: number; alpha?: number } | number;
export type StrokeStyle = { color: number; width: number; alpha?: number };

export const fillStyle = (fill: FillStyle, alpha = 1) =>
	typeof fill === 'number' ? { color: fill, alpha } : fill;

export const rc = (
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	fill?: FillStyle,
	stroke?: StrokeStyle,
	alpha = 1
) => {
	g.rect(x, y, w, h);
	if (fill !== undefined) g.fill(fillStyle(fill, alpha));
	if (stroke) g.stroke(stroke);
};

export const rr = (
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	rad: number,
	fill?: FillStyle,
	stroke?: StrokeStyle,
	alpha = 1
) => {
	g.roundRect(x, y, w, h, rad);
	if (fill !== undefined) g.fill(fillStyle(fill, alpha));
	if (stroke) g.stroke(stroke);
};

export const ci = (
	g: Graphics,
	x: number,
	y: number,
	rad: number,
	fill?: FillStyle,
	stroke?: StrokeStyle,
	alpha = 1
) => {
	g.circle(x, y, rad);
	if (fill !== undefined) g.fill(fillStyle(fill, alpha));
	if (stroke) g.stroke(stroke);
};

export const el = (
	g: Graphics,
	x: number,
	y: number,
	rx: number,
	ry: number,
	fill?: FillStyle,
	stroke?: StrokeStyle,
	alpha = 1
) => {
	g.ellipse(x, y, rx, ry);
	if (fill !== undefined) g.fill(fillStyle(fill, alpha));
	if (stroke) g.stroke(stroke);
};

export const pg = (
	g: Graphics,
	pts: number[],
	fill?: FillStyle,
	stroke?: StrokeStyle,
	alpha = 1
) => {
	g.poly(pts);
	if (fill !== undefined) g.fill(fillStyle(fill, alpha));
	if (stroke) g.stroke(stroke);
};

export const ln = (g: Graphics, pts: number[], color: number, width: number, alpha = 1) => {
	g.beginPath();
	g.moveTo(pts[0], pts[1]);
	for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
	g.stroke({ color, width, alpha });
};
