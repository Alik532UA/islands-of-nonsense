export interface CameraPanInput {
	left: boolean;
	right: boolean;
	up: boolean;
	down: boolean;
}

export interface CameraPanState {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

export const KEYBOARD_PAN_SPEED = 1450; // World px/sec at 1x zoom
export const EDGE_PAN_SPEED = 950; // World px/sec at 1x zoom
export const PAN_ACCEL_RATE = 24; // Smooth ramp-up rate (1/s)
export const PAN_DECEL_RATE = 18; // Smooth glide-to-stop damping rate (1/s)

/**
 * Advances RTS camera position and velocity using frame-rate-independent exponential
 * smoothing for silky acceleration, normalized diagonal panning, and gentle inertia.
 */
export function stepSmoothCameraPan(
	state: CameraPanState,
	keyInput: CameraPanInput,
	edgeInput: CameraPanInput,
	zoom: number,
	dtSeconds: number
): CameraPanState {
	const dt = Math.max(0, Math.min(0.05, dtSeconds));
	if (dt === 0) return state;

	let dx = (keyInput.right ? 1 : 0) - (keyInput.left ? 1 : 0);
	let dy = (keyInput.down ? 1 : 0) - (keyInput.up ? 1 : 0);
	let speed = KEYBOARD_PAN_SPEED;

	if (dx === 0 && dy === 0) {
		dx = (edgeInput.right ? 1 : 0) - (edgeInput.left ? 1 : 0);
		dy = (edgeInput.down ? 1 : 0) - (edgeInput.up ? 1 : 0);
		speed = EDGE_PAN_SPEED;
	}

	const mag = Math.hypot(dx, dy);
	const invZoom = 1 / Math.max(0.25, zoom);
	const targetVx = mag > 0 ? (dx / mag) * speed * invZoom : 0;
	const targetVy = mag > 0 ? (dy / mag) * speed * invZoom : 0;

	const rate = mag > 0 ? PAN_ACCEL_RATE : PAN_DECEL_RATE;
	const alpha = 1 - Math.exp(-rate * dt);

	let vx = state.vx + (targetVx - state.vx) * alpha;
	let vy = state.vy + (targetVy - state.vy) * alpha;

	if (mag === 0) {
		if (Math.abs(vx) < 2) vx = 0;
		if (Math.abs(vy) < 2) vy = 0;
	}

	return {
		x: state.x + vx * dt,
		y: state.y + vy * dt,
		vx,
		vy
	};
}
