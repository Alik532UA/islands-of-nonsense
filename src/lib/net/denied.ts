/**
 * Helper to identify RTDB permission denied errors.
 */
export function isDenied(error: unknown): boolean {
	return /permission[_ ]denied/i.test(error instanceof Error ? error.message : String(error));
}
