/**
 * Firebase Local Emulator configuration for development and automated tests.
 */
export const EMULATOR: boolean = import.meta.env.DEV && import.meta.env.MODE !== 'live';

export const EMULATOR_PROJECT = EMULATOR ? 'demo-islands-of-nonsense' : '';
export const EMULATOR_HOST = EMULATOR ? '127.0.0.1' : '';
export const EMULATOR_PORTS = EMULATOR ? { database: 9012, auth: 9111 } : { database: 0, auth: 0 };
export const EMULATOR_COMMAND = 'npm run emulators';
