import hidden from '$lib/i18n/hidden-routes.json';
import type { BetaTab } from './types';

/** Адреса сторінки — єдине джерело з переліку прихованих маршрутів (BETA-CHECKLIST-PAGE.md § 1) */
export const BETA_ROUTE: string = hidden.betaChecklist;

export const BETA_TABS: BetaTab[] = [
	{
		id: 'battle',
		title: { uk: 'Поле бою та Арена', en: 'Battle Arena & Combat' },
		routes: ['/play/battle'],
		checks: [
			{
				id: 'battle_spawn',
				category: { uk: 'Юніти', en: 'Units' },
				text: {
					uk: 'Побудована споруда стабільно спавнить війська після завершення таймера',
					en: 'Constructed spawner steadily spawns troops once cooldown completes'
				},
				coverage: 'covered',
				testFile: 'src/lib/engine/simulation.test.ts'
			},
			{
				id: 'battle_collision',
				category: { uk: 'Продуктивність', en: 'Performance' },
				text: {
					uk: 'При 200+ юнітах на арені рух залишається плавним без просідання нижче 50 FPS',
					en: 'With 200+ units on arena movement stays smooth without dropping below 50 FPS'
				},
				coverage: 'covered',
				testFile: 'src/lib/engine/dayNightAndPerformance.test.ts'
			},
			{
				id: 'battle_leave_modal',
				category: { uk: 'Інтерфейс', en: 'UI' },
				text: {
					uk: 'Кнопка "Покинути бій" відкриває модальне вікно підтвердження та не скидає матч випадково',
					en: 'Leave button triggers confirmation modal without abandoning match prematurely'
				},
				testid: 'modal-leave-confirm',
				coverage: 'covered',
				testFile: 'src/lib/components/leaveGameModal.test.ts'
			},
			{
				id: 'battle_rescue',
				category: { uk: 'Здібності', en: 'Abilities' },
				text: {
					uk: 'Спасительний удар замку (клавіша E) завдає шкоди ворогам і має одноразове використання',
					en: 'Rescue Strike (E key) wipes enemy wave and can be used once'
				},
				testid: 'btn-rescue-strike',
				coverage: 'covered',
				testFile: 'src/lib/engine/rescueStrike.test.ts'
			}
		]
	},
	{
		id: 'online',
		title: { uk: 'Онлайн лобі та Мережа', en: 'Online Lobby & Net' },
		routes: ['/online'],
		checks: [
			{
				id: 'online_room_code',
				category: { uk: 'Кімнати', en: 'Rooms' },
				text: {
					uk: 'Код кімнати містить лише однозначні символи без плутанини (0/O, 1/I/L)',
					en: 'Room code uses unambiguous characters without visual confusion'
				},
				coverage: 'covered',
				testFile: 'src/lib/net/roomCode.test.ts'
			},
			{
				id: 'online_presence',
				category: { uk: 'Синхронізація', en: 'Sync' },
				text: {
					uk: 'Статус присутності гравця гасне при закритті вкладки або розриві з’єднання',
					en: 'Player presence status turns offline when tab closes or connection breaks'
				},
				coverage: 'covered',
				testFile: 'src/lib/net/database.rules.test.ts'
			}
		]
	},
	{
		id: 'settings',
		title: { uk: 'Налаштування та PWA', en: 'Settings & PWA' },
		routes: ['/'],
		checks: [
			{
				id: 'settings_theme_contrast',
				category: { uk: 'Доступність', en: 'A11y' },
				text: {
					uk: 'Усі 4 кольорові теми відповідають стандарту WCAG AA за контрастом',
					en: 'All 4 color themes comply with WCAG AA color contrast'
				},
				coverage: 'covered',
				testFile: 'src/theme-contrast.test.ts'
			},
			{
				id: 'settings_pwa_update',
				category: { uk: 'PWA', en: 'PWA' },
				text: {
					uk: 'Оновлення сервіс-воркера пропонується тостом без раптового перезавантаження під час бою',
					en: 'Service worker update is offered via toast without abrupt reload during battle'
				},
				coverage: 'covered',
				testFile: 'src/lib/pwa/serviceWorkerUpdate.test.ts'
			}
		]
	}
];
