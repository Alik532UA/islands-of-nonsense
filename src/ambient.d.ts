declare module '$app/env' {
	export const browser: boolean;
	export const dev: boolean;
	export const building: boolean;
	export const version: string;
}

declare module '$app/environment' {
	export const browser: boolean;
	export const dev: boolean;
	export const building: boolean;
	export const version: string;
}

declare module '$app/paths' {
	export const base: string;
	export const assets: string;
	export function resolve(route: string, params?: Record<string, string>): string;
	export function asset(path: string): string;
	export function match(url: string | URL): Promise<unknown>;
}
