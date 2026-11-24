export type Guide =
	| 'ios-safari'
	| 'ios-chrome'
	| 'ios-other'
	| 'ipad-safari'
	| 'android'
	| 'android-edge'
	| 'desktop'
	| 'edge'
	| 'mac-safari'
	| 'firefox-desktop'
	| 'in-app';

export type StepIcon =
	| 'share'
	| 'add'
	| 'dots'
	| 'menu'
	| 'install'
	| 'installEdge'
	| 'dock'
	| 'browser'
	| 'phone'
	| 'app';

export interface Step {
	text: string;
	icon: StepIcon;
}

export interface GuideText {
	title: string;
	note: string;
	steps: readonly Step[];
	warning?: string;
}

const IN_APP =
	/FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|Pinterest/i;

export function guideFor(userAgent: string, maxTouchPoints: number): Guide {
	if (IN_APP.test(userAgent)) return 'in-app';
	const iPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
	if (iPad || /iPhone|iPod/.test(userAgent)) {
		if (/CriOS/.test(userAgent)) return 'ios-chrome';
		if (/FxiOS|EdgiOS|OPiOS/.test(userAgent)) return 'ios-other';
		return iPad ? 'ipad-safari' : 'ios-safari';
	}
	if (/Android/.test(userAgent)) return /EdgA\//.test(userAgent) ? 'android-edge' : 'android';
	if (/Firefox\//.test(userAgent)) return 'firefox-desktop';
	if (/Edg\//.test(userAgent)) return 'edge';
	if (/Macintosh/.test(userAgent) && !/Chrome|Chromium|OPR/.test(userAgent)) return 'mac-safari';
	return 'desktop';
}

const MANUAL = 'install.note.manual';
const ADD_HOME: Step = { text: 'install.step.addHome', icon: 'add' };
const OPEN_HOME: Step = { text: 'install.step.openHome', icon: 'phone' };
const CONFIRM: Step = { text: 'install.step.confirm', icon: 'add' };
const OPEN_APP: Step = { text: 'install.step.openApp', icon: 'app' };

export const GUIDES: Record<Guide, GuideText> = {
	'ios-safari': {
		title: 'install.title.iphone',
		note: MANUAL,
		steps: [{ text: 'install.step.shareBottom', icon: 'share' }, ADD_HOME, OPEN_HOME]
	},
	'ios-chrome': {
		title: 'install.title.app',
		note: MANUAL,
		steps: [
			{ text: 'install.step.shareAddressBar', icon: 'share' },
			{ text: 'install.step.addHomeChrome', icon: 'add' },
			OPEN_HOME
		],
		warning: 'install.warning.iosChrome'
	},
	'ios-other': {
		title: 'install.title.app',
		note: MANUAL,
		steps: [{ text: 'install.step.shareMenu', icon: 'share' }, ADD_HOME, OPEN_HOME]
	},
	'ipad-safari': {
		title: 'install.title.ipad',
		note: MANUAL,
		steps: [{ text: 'install.step.shareTop', icon: 'share' }, ADD_HOME, OPEN_HOME]
	},
	android: {
		title: 'install.title.android',
		note: MANUAL,
		steps: [
			{ text: 'install.step.dots', icon: 'dots' },
			{ text: 'install.step.addHomeAndroid', icon: 'add' },
			{ text: 'install.step.openHomeAndroid', icon: 'phone' }
		]
	},
	'android-edge': {
		title: 'install.title.android',
		note: MANUAL,
		steps: [
			{ text: 'install.step.edgeMenu', icon: 'menu' },
			{ text: 'install.step.edgeAddToPhone', icon: 'add' },
			{ text: 'install.step.openHomeAndroid', icon: 'phone' }
		]
	},
	desktop: {
		title: 'install.title.desktop',
		note: MANUAL,
		steps: [{ text: 'install.step.installIcon', icon: 'install' }, CONFIRM, OPEN_APP]
	},
	edge: {
		title: 'install.title.desktop',
		note: MANUAL,
		steps: [{ text: 'install.step.installIcon', icon: 'installEdge' }, CONFIRM, OPEN_APP]
	},
	'mac-safari': {
		title: 'install.title.mac',
		note: MANUAL,
		steps: [
			{ text: 'install.step.macFile', icon: 'dock' },
			{ text: 'install.step.macAdd', icon: 'add' },
			{ text: 'install.step.openDock', icon: 'app' }
		]
	},
	'firefox-desktop': {
		title: 'install.title.desktop',
		note: 'install.note.firefox',
		steps: [
			{ text: 'install.step.openChromeEdge', icon: 'browser' },
			{ text: 'install.step.installIcon', icon: 'install' },
			OPEN_APP
		]
	},
	'in-app': {
		title: 'install.title.inApp',
		note: 'install.note.inApp',
		steps: [
			{ text: 'install.step.inAppMenu', icon: 'dots' },
			{ text: 'install.step.openBrowser', icon: 'browser' }
		]
	}
};
