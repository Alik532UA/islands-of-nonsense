import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Play Modes (/play) & MatchConfigModal Presets Architecture', () => {
	const playPagePath = path.resolve(process.cwd(), 'src/routes/play/+page.svelte');
	const setupPagePath = path.resolve(process.cwd(), 'src/routes/play/setup/+page.svelte');
	const configModalPath = path.resolve(process.cwd(), 'src/lib/components/MatchConfigModal.svelte');

	const playContent = fs.readFileSync(playPagePath, 'utf-8');
	const setupContent = fs.readFileSync(setupPagePath, 'utf-8');
	const modalContent = fs.readFileSync(configModalPath, 'utf-8');

	it('Play page displays 4 game modes in a row with responsive layout', () => {
		expect(playContent).toContain('lg:grid-cols-4');
		expect(playContent).toContain('data-testid="play-battle-card"');
		expect(playContent).toContain('data-testid="play-sandbox-card"');
		expect(playContent).toContain('data-testid="play-spectator-card"');
		expect(playContent).toContain('data-testid="play-custom-card"');
	});

	it('Play page provides quick start actions and quick customize buttons for presets', () => {
		expect(playContent).toContain('data-testid="play-battle-link"');
		expect(playContent).toContain('data-testid="play-sandbox-link"');
		expect(playContent).toContain('data-testid="play-spectator-link"');
		expect(playContent).toContain('data-testid="customize-btn-vsBot"');
		expect(playContent).toContain('data-testid="customize-btn-sandbox"');
		expect(playContent).toContain('data-testid="customize-btn-botVsBot"');
		expect(playContent).toContain('data-testid="open-custom-config-btn"');
	});

	it('Play page positions cards ~20% above center with no redundant vertical scrollbar on desktop', () => {
		expect(playContent).toContain('min-h-[calc(100dvh-56px)]');
		expect(playContent).not.toContain('min-h-screen');
		expect(playContent).not.toContain('!justify-start');
		expect(playContent).toContain('flex-[1]');
		expect(playContent).toContain('flex-[2.5]');
		expect(playContent).toContain('invisible group-hover:visible');
	});

	it('/play/setup cleanly redirects to canonical /play route', () => {
		expect(setupContent).toContain("goto(resolve('/play')");
	});

	it('MatchConfigModal provides top preset switcher with dynamic Custom indicator', () => {
		expect(modalContent).toContain('data-testid="preset-btn-classic"');
		expect(modalContent).toContain('data-testid="preset-btn-sandbox"');
		expect(modalContent).toContain('data-testid="preset-btn-botVsBot"');
		expect(modalContent).toContain('data-testid="preset-btn-custom"');
		expect(modalContent).toContain('applyPreset');
		expect(modalContent).toContain('activePreset');
	});

	it('MatchConfigModal provides in-game choice as default alongside full race selection without redundant kingdom titles', () => {
		expect(modalContent).toContain('data-testid="race-option-in_game"');
		expect(modalContent).toContain('data-testid="race-option-random"');
		expect(modalContent).toContain('data-testid="race-option-');
		expect(modalContent).toContain('data-testid="bot-race-random"');
		expect(modalContent).toContain('data-testid="bot-race-');
		expect(modalContent).not.toContain('Королівство');
	});

	it('MatchConfigModal uses interactive button-pill controls instead of dropdown selects', () => {
		expect(modalContent).not.toContain('<select');
		expect(modalContent).not.toContain('<option');
		expect(modalContent).toContain('data-testid="setup-bot-difficulty"');
		expect(modalContent).toContain('data-testid="setup-start-gold"');
		expect(modalContent).toContain('data-testid="setup-team-size"');
		expect(modalContent).toContain('data-testid="setup-target-wins"');
		expect(modalContent).toContain('data-testid="difficulty-btn-');
		expect(modalContent).toContain('data-testid="gold-btn-');
		expect(modalContent).toContain('data-testid="teamsize-btn-');
		expect(modalContent).toContain('data-testid="targetwins-btn-');
	});

	it('MatchConfigModal implements a balanced 3-column command layout (West, Center, East) with central hero button', () => {
		expect(modalContent).toContain('lg:grid-cols-[190px_1fr_190px]');
		expect(modalContent).toContain('Захід (Гравець)');
		expect(modalContent).toContain('Схід (Бот)');
		expect(modalContent).toContain('max-w-6xl');
		expect(modalContent).toContain('data-testid="config-modal-apply-btn"');
		expect(playContent).toContain('max-w-[96vw]');
	});

	it('MatchConfigModal provides fine sliders for bot difficulty, start gold (with infinite sandbox) and coin rules', () => {
		expect(modalContent).toContain('data-testid="bot-difficulty-slider"');
		expect(modalContent).toContain('data-testid="start-gold-slider"');
		expect(modalContent).toContain('data-testid="gold-btn-infinite"');
		expect(modalContent).toContain('data-testid="setup-coins"');
		expect(modalContent).toContain('data-testid="toggle-custom-coins-btn"');
		expect(modalContent).toContain('data-testid="coin-interval-slider"');
		expect(modalContent).toContain('data-testid="coin-count-slider"');
	});

	it('MatchConfigModal integrates race banning directly into Bot selection and features full-width modes grid', () => {
		expect(modalContent).toContain('data-testid="ban-race-');
		expect(modalContent).toContain('data-testid="mode-card-');
		expect(modalContent).not.toContain('Бан рас (до 2):');
	});
});
