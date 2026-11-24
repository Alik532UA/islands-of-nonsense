import { describe, it, expect } from 'vitest';
import { guideFor, GUIDES, type Guide } from './installGuide';
import { translations } from '$lib/i18n';

describe('PWA & Fullscreen Install Guides (FULLSCREEN-INSTALL.md & PWA-v10)', () => {
	const uk = translations.uk as Record<string, string>;
	const en = translations.en as Record<string, string>;

	describe('guideFor detection logic', () => {
		it('detects iOS Safari on iPhone', () => {
			const ua =
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
			expect(guideFor(ua, 5)).toBe('ios-safari');
		});

		it('detects iPad Safari via touch points on desktop-like Macintosh UA', () => {
			const ua =
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
			expect(guideFor(ua, 5)).toBe('ipad-safari');
			expect(guideFor(ua, 0)).toBe('mac-safari');
		});

		it('detects Chrome on iOS (CriOS)', () => {
			const ua =
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.69 Mobile/15E148 Safari/604.1';
			expect(guideFor(ua, 5)).toBe('ios-chrome');
		});

		it('detects in-app webviews (Instagram, Facebook)', () => {
			const ua =
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0';
			expect(guideFor(ua, 5)).toBe('in-app');
		});

		it('detects Android Chrome and Edge', () => {
			const uaChrome =
				'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
			expect(guideFor(uaChrome, 5)).toBe('android');

			const uaEdge =
				'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EdgA/120.0.0.0';
			expect(guideFor(uaEdge, 5)).toBe('android-edge');
		});

		it('detects desktop Firefox and Edge', () => {
			const uaFf = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0';
			expect(guideFor(uaFf, 0)).toBe('firefox-desktop');

			const uaEdge =
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
			expect(guideFor(uaEdge, 0)).toBe('edge');
		});
	});

	describe('Guide dictionary parity and completeness', () => {
		const allGuides: Guide[] = [
			'ios-safari',
			'ios-chrome',
			'ios-other',
			'ipad-safari',
			'android',
			'android-edge',
			'desktop',
			'edge',
			'mac-safari',
			'firefox-desktop',
			'in-app'
		];

		it('every guide has localized title, note, and steps in both languages', () => {
			for (const key of allGuides) {
				const guide = GUIDES[key];
				expect(guide, `Guide ${key} must exist`).toBeDefined();

				// Title
				expect(uk[guide.title], `UK title for ${key}`).toBeTruthy();
				expect(en[guide.title], `EN title for ${key}`).toBeTruthy();

				// Note
				expect(uk[guide.note], `UK note for ${key}`).toBeTruthy();
				expect(en[guide.note], `EN note for ${key}`).toBeTruthy();

				// Steps
				expect(guide.steps.length).toBeGreaterThan(0);
				for (const step of guide.steps) {
					expect(uk[step.text], `UK step text '${step.text}' in ${key}`).toBeTruthy();
					expect(en[step.text], `EN step text '${step.text}' in ${key}`).toBeTruthy();
					expect(step.icon).toBeTruthy();
				}

				// Optional Warning
				if (guide.warning) {
					expect(uk[guide.warning], `UK warning for ${key}`).toBeTruthy();
					expect(en[guide.warning], `EN warning for ${key}`).toBeTruthy();
				}
			}
		});
	});
});
