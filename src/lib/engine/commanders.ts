import type { Commander } from './types';

export const COMMANDERS: Commander[] = [
	{
		id: 1,
		name: 'Саша',
		nickname: 'Банкір',
		description: '+12% до всього доходу золота',
		icon: 'Coins'
	},
	{
		id: 2,
		name: 'Алик',
		nickname: 'Майстер кузні',
		description: 'Кузня та всі її покращення дешевші на 50%',
		icon: 'Hammer'
	},
	{
		id: 3,
		name: 'Дима',
		nickname: 'Воєначальник',
		description: '+24% до базової шкоди всіх бійців',
		icon: 'Sword'
	},
	{
		id: 4,
		name: 'Дэн',
		nickname: 'Берсерк',
		description: '+24% до швидкості атаки всіх бійців',
		icon: 'Zap'
	},
	{
		id: 5,
		name: 'Юра',
		nickname: 'Снайпер',
		description: '25% шанс критичного удару (×2 шкоди)',
		icon: 'Target'
	},
	{
		id: 6,
		name: 'Леша',
		nickname: 'Фантом',
		description: '20% шанс ухилитися від ворожої атаки',
		icon: 'Shield'
	}
];

export function getCommander(id: number): Commander {
	return COMMANDERS.find((c) => c.id === id) || COMMANDERS[0];
}
