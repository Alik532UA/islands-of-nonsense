import { describe, it, expect } from 'vitest';
import { GAME_MODES, getGameMode } from './gameModes';
import { Simulation } from './simulation';

describe('Point 9: Game Modes & Random Race Bonus (+30% Gold)', () => {
	it('містить стандартні, розширені та класичні турнірні режими (-ar, -ur)', () => {
		expect(GAME_MODES.standard).toBeDefined();
		expect(GAME_MODES.blitz).toBeDefined();
		expect(GAME_MODES.survival).toBeDefined();
		expect(GAME_MODES.sandbox).toBeDefined();
		expect(GAME_MODES.allRandom).toBeDefined();
		expect(GAME_MODES.uniqueRaces).toBeDefined();

		expect(GAME_MODES.allRandom.allRandom).toBe(true);
		expect(GAME_MODES.uniqueRaces.uniqueRaces).toBe(true);
	});

	it('getGameMode повертає правильні налаштування з фолбеком', () => {
		const blitz = getGameMode('blitz');
		expect(blitz.startGold).toBe(300);
		expect(blitz.incomeMultiplier).toBe(2.0);

		const fallback = getGameMode('unknown_mode');
		expect(fallback.id).toBe('standard');
	});

	it('надає +30% стартового золота за вибір випадкової раси', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			westRace: 'Люди'
		});

		// Player starts with standard 500 gold
		expect(sim.players.west.gold).toBe(500);
		expect(sim.players.west.isRandomRace).toBe(false);

		// Switch to random race at start of match
		const success = sim.setPlayerRace('west', 'random');
		expect(success).toBe(true);
		expect(sim.players.west.isRandomRace).toBe(true);

		// Gold should increase by +30% (500 + 150 = 650)
		expect(sim.players.west.gold).toBe(650);
	});

	it('скасовує бонус +30%, якщо гравець власноруч змінює випадкову расу на фіксовану', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			westRace: 'random'
		});

		// Initial random race had +30% bonus (650)
		expect(sim.players.west.gold).toBe(650);

		// Switch away from random to 'Люди'
		sim.setPlayerRace('west', 'Люди');
		expect(sim.players.west.race).toBe('Люди');
		expect(sim.players.west.isRandomRace).toBe(false);
		expect(sim.players.west.gold).toBe(500);
	});

	it('забороняє вибір однакової раси в режимі Unique Races (-ur)', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			uniqueRaces: true,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		// West attempts to pick East's race ('Орки')
		const result = sim.setPlayerRace('west', 'Орки');
		expect(result).toBe(false);
		expect(sim.players.west.race).toBe('Люди');

		// Picking another free race succeeds
		const validPick = sim.setPlayerRace('west', 'Нежить');
		expect(validPick).toBe(true);
		expect(sim.players.west.race).toBe('Нежить');
	});

	it('в режимі All Random (-ar) обидві команди отримують випадкові раси та бонус золота', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			allRandom: true,
			uniqueRaces: true
		});

		expect(sim.players.west.isRandomRace).toBe(true);
		expect(sim.players.east.isRandomRace).toBe(true);
		expect(sim.players.west.gold).toBe(650);
		expect(sim.players.east.gold).toBe(650);

		// Both teams should have different races due to uniqueRaces
		expect(sim.players.west.race).not.toBe(sim.players.east.race);
	});

	it('забороняє будівництво особливих споруд у режимі -nu / noSpecial', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			modeId: 'noSpecial',
			westRace: 'Люди'
		});
		sim.decorations = [];

		// cg07_recycler is a special recycler building
		const builtSpecial = sim.build('west', 'cg07_recycler', 25, 20);
		expect(builtSpecial).toBe(false);

		// h03Q is Frost Tower - defensive towers are allowed
		sim.players.west.lumber = 1000;
		const builtTower = sim.build('west', 'h03Q', 25, 20);
		expect(builtTower).toBe(true);
	});

	it('забороняє будівництво артилерії у режимі -na / noArtillery', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			modeId: 'noArtillery',
			westRace: 'Люди'
		});

		// cg0a is Garbage Ballista (attack_type: siege)
		const builtArtillery = sim.build('west', 'cg0a', 25, 20);
		expect(builtArtillery).toBe(false);

		// Guard Tower (h006) is allowed
		sim.players.west.lumber = 1000;
		const builtNormal = sim.build('west', 'h006', 25, 20);
		expect(builtNormal).toBe(true);
	});

	it('вимикає Рятівний Удар у режимі -nw / noRescueStrike', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			modeId: 'noRescueStrike'
		});

		expect(sim.canUseRescueStrike('west')).toBe(false);
		expect(sim.triggerRescueStrike('west')).toBeNull();
	});

	it('спрямовує війська на одну лінію в режимі -sl / singleLane', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			modeId: 'singleLane'
		});

		const unit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom', // attempts to spawn on bottom
			x: 500,
			y: 600
		});

		expect(unit.lane).toBe('top');
	});

	it('надає бонуси доходу за утримання ліній у режимі -dm / domination', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			modeId: 'domination'
		});

		// Spawn 3 west units in middle domination zone on top lane
		sim.spawnUnitDirectly({ team: 'west', lane: 'top', x: 3500, y: sim.topLaneY });
		sim.spawnUnitDirectly({ team: 'west', lane: 'top', x: 3520, y: sim.topLaneY });
		sim.spawnUnitDirectly({ team: 'west', lane: 'top', x: 3540, y: sim.topLaneY });

		const initialGold = sim.players.west.gold;
		// Step economy to trigger income cycle
		sim.economySystem.updateEconomy(sim.incomeInterval + 0.1);

		// Gold should increase by base income + 15 domination bonus
		expect(sim.players.west.gold).toBeGreaterThan(initialGold + 15);
	});

	it('дозволяє покупку ядерної боєголовки у режимі -nuke / nuclearWarheads', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			modeId: 'nuclearWarheads'
		});
		sim.buildings.push({
			instanceId: 'test_shop_west',
			defId: 'cg10_shop',
			name: 'Магазин',
			team: 'west',
			specialType: 'shop',
			tileX: 10,
			tileY: 10,
			x: 1600,
			y: 1200,
			hp: 1000,
			maxHp: 1000,
			armor: 5,
			armorType: 'fort',
			goldCost: 50,
			lumberCost: 50,
			spawnUnitId: '',
			spawnCooldown: 0,
			spawnTimer: 0,
			lane: 'mid',
			upgradeFrom: null,
			race: 'Люди'
		});

		expect(sim.canBuyCastleItem('west', 'I00N')).toBe(true);
		const initialHp = sim.castles.east.hp;
		const bought = sim.buyCastleItem('west', 'I00N');
		expect(bought).toBe(true);
		expect(sim.castles.east.hp).toBe(initialHp - 800);
	});

	it('містить режим бан-драфту (-ban / banDraft) у GAME_MODES', () => {
		expect(GAME_MODES.banDraft).toBeDefined();
		expect(GAME_MODES.banDraft.banDraft).toBe(true);
		expect(GAME_MODES.banDraft.banCount).toBe(2);
	});

	it('забороняє вибір заблокованих рас у режимі бан-драфту (-ban)', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			bannedRaces: ['Люди', 'Нежить'],
			westRace: 'Орки'
		});

		expect(sim.bannedRaces).toEqual(['Люди', 'Нежить']);
		expect(sim.isRaceBanned('Люди')).toBe(true);
		expect(sim.isRaceBanned('Нежить')).toBe(true);
		expect(sim.isRaceBanned('Орки')).toBe(false);

		// getAvailableRaces should exclude banned races
		const available = sim.getAvailableRaces();
		expect(available.includes('Люди')).toBe(false);
		expect(available.includes('Нежить')).toBe(false);
		expect(available.includes('Орки')).toBe(true);

		// Direct pick of a banned race fails
		const bannedPick = sim.setPlayerRace('west', 'Люди');
		expect(bannedPick).toBe(false);
		expect(sim.players.west.race).toBe('Орки');

		// Picking allowed race succeeds
		const allowedPick = sim.setPlayerRace('west', 'Наги');
		expect(allowedPick).toBe(true);
		expect(sim.players.west.race).toBe('Наги');
	});

	it('випадковий вибір раси (random / allRandom) ніколи не призначає заблоковані раси (-ban)', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			bannedRaces: ['Люди', 'Орки'],
			allRandom: true
		});

		for (let i = 0; i < 30; i++) {
			sim.setPlayerRace('west', 'random');
			expect(sim.players.west.race).not.toBe('Люди');
			expect(sim.players.west.race).not.toBe('Орки');
		}
	});

	it('resetRound ігнорує спробу встановити заблоковану расу', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			bannedRaces: ['Хаос'],
			westRace: 'Люди'
		});

		sim.resetRound({ west: 'Хаос' });
		// Race remains 'Люди' because 'Хаос' is banned
		expect(sim.players.west.race).toBe('Люди');

		sim.resetRound({ west: 'Наги' });
		expect(sim.players.west.race).toBe('Наги');
	});
});
