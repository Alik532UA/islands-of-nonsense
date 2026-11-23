/**
 * FNV-1a 32-bit string hash.
 */
export function fnv1a(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i += 1) {
		hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
	}
	return hash >>> 0;
}
