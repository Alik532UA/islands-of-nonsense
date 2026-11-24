export type CoverageType = 'manual' | 'automated' | 'covered';

export interface Localized {
	uk: string;
	en: string;
}

export interface BetaCheck {
	id: string;
	category: Localized;
	text: Localized;
	testid?: string;
	coverage: CoverageType;
	negative?: boolean;
	testFile?: string;
}

export interface BetaTab {
	id: string;
	title: Localized;
	routes: string[];
	checks: BetaCheck[];
}

export type CheckStatus = 'ok' | 'fail' | 'unclear' | 'skip';
