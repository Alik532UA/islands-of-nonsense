// src/lib/utils/focusTrap.ts
/**
 * Focus trap utility for accessible modals (ACCESSIBILITY-v10 § 4.4).
 */
export function focusTrap(node: HTMLElement) {
	const focusableSelectors =
		'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Tab') return;
		const focusable = Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
			(el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0
		);

		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (event.shiftKey) {
			if (document.activeElement === first) {
				last.focus();
				event.preventDefault();
			}
		} else {
			if (document.activeElement === last) {
				first.focus();
				event.preventDefault();
			}
		}
	};

	node.addEventListener('keydown', handleKeydown);
	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
		}
	};
}
