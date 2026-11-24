import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Modal Viewport Constraints, Multi-Column Layout & Scroll Overflow Invariants', () => {
	const componentsDir = path.resolve(process.cwd(), 'src/lib/components');

	// Map of modals and their design invariants
	const modals = [
		{
			file: 'SettingsModal.svelte',
			hasScroll: true,
			hasMultiColumn: true,
			viewportConstraint: true
		},
		{
			file: 'ForgeModal.svelte',
			hasScroll: true,
			hasMultiColumn: false,
			viewportConstraint: true
		},
		{
			file: 'ShopModal.svelte',
			hasScroll: true,
			hasMultiColumn: false,
			viewportConstraint: true
		},
		{
			file: 'CommanderModal.svelte',
			hasScroll: true,
			hasMultiColumn: false,
			viewportConstraint: true
		},
		{
			file: 'HotkeysHelpModal.svelte',
			hasScroll: true,
			hasMultiColumn: false,
			viewportConstraint: true
		},
		{
			file: 'MatchConfigModal.svelte',
			hasScroll: true,
			hasMultiColumn: true,
			viewportConstraint: true
		}
	];

	it('SettingsModal implements multi-column layout for spacious setting panels', () => {
		const content = fs.readFileSync(path.join(componentsDir, 'SettingsModal.svelte'), 'utf-8');

		// Must use responsive multi-column layout for interface settings
		expect(
			content.includes('grid-cols-1 md:grid-cols-2') || content.includes('grid-cols-2'),
			'SettingsModal interface settings must be organized in multiple columns (at least 2)'
		).toBe(true);

		// Must use widened modal wrapper (max-w-4xl or larger) to avoid cramped single column
		expect(
			content.includes('max-w-4xl') ||
				content.includes('max-w-5xl') ||
				content.includes('max-w-6xl'),
			'SettingsModal must declare widened max-w (e.g. max-w-4xl) to utilize screen width'
		).toBe(true);
	});

	it('SettingsModal guarantees vertical scrollability and never clips unreachable options', () => {
		const content = fs.readFileSync(path.join(componentsDir, 'SettingsModal.svelte'), 'utf-8');

		// Tab content must have scroll container
		expect(
			content.includes('overflow-y-auto'),
			'SettingsModal content container must specify overflow-y-auto'
		).toBe(true);

		// Container must be bound to viewport (e.g. max-h-[90vh])
		expect(
			content.includes('max-h-[90vh]') || content.includes('max-h-screen'),
			'SettingsModal dialog container must be bounded by viewport height constraint'
		).toBe(true);

		// Close / footer button must be pinned and not shrink/scroll away
		expect(
			content.includes('shrink-0'),
			'SettingsModal header and footer must declare shrink-0 to remain visible'
		).toBe(true);
	});

	it('all application modals enforce viewport boundary constraints preventing page overflow', () => {
		for (const modal of modals) {
			const filePath = path.join(componentsDir, modal.file);
			expect(fs.existsSync(filePath), `Modal file ${modal.file} must exist`).toBe(true);
			const content = fs.readFileSync(filePath, 'utf-8');

			if (modal.viewportConstraint) {
				const hasViewportBound =
					content.includes('max-h-[') ||
					content.includes('max-h-screen') ||
					content.includes('h-screen') ||
					content.includes('h-full') ||
					content.includes('min-h-screen');

				expect(
					hasViewportBound,
					`Modal ${modal.file} must declare a viewport height constraint (e.g. max-h-[90vh])`
				).toBe(true);
			}
		}
	});

	it('all rich content modals implement scroll containers so content never gets cut off', () => {
		for (const modal of modals) {
			if (!modal.hasScroll) continue;

			const filePath = path.join(componentsDir, modal.file);
			const content = fs.readFileSync(filePath, 'utf-8');

			const hasScroll =
				content.includes('overflow-y-auto') ||
				content.includes('overflow-auto') ||
				content.includes('overflow-y-scroll');

			expect(
				hasScroll,
				`Modal ${modal.file} must have an overflow-y-auto container for scrollable content`
			).toBe(true);
		}
	});
});
