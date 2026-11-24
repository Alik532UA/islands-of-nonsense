import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const FIREBASE_CLI_VERSION = '15.37.0';
const ROOT = process.cwd();

export function getEmulatorPorts() {
	const firebaseJsonPath = resolve(ROOT, 'firebase.json');
	const config = existsSync(firebaseJsonPath)
		? JSON.parse(readFileSync(firebaseJsonPath, 'utf8'))
		: {};
	const emulators = config.emulators ?? {};
	return {
		auth: Number(emulators.auth?.port ?? 9111),
		database: Number(emulators.database?.port ?? 9012)
	};
}

export async function isPortFree(port, host = '127.0.0.1') {
	return new Promise((resolvePort) => {
		const server = createServer();
		server.once('error', () => resolvePort(false));
		server.once('listening', () => {
			server.close(() => resolvePort(true));
		});
		server.listen(port, host);
	});
}

export async function findFreePort(host = '127.0.0.1') {
	return new Promise((resolvePort, rejectPort) => {
		const server = createServer();
		server.once('error', rejectPort);
		server.listen(0, host, () => {
			const addr = server.address();
			const port = typeof addr === 'object' && addr ? addr.port : 0;
			server.close(() => resolvePort(port));
		});
	});
}

function findCachedFirebaseBin() {
	const localJs = resolve(ROOT, 'node_modules/firebase-tools/lib/bin/firebase.js');
	if (existsSync(localJs)) return localJs;

	const cacheRoots = [];
	if (process.env.LOCALAPPDATA)
		cacheRoots.push(join(process.env.LOCALAPPDATA, 'npm-cache', '_npx'));
	cacheRoots.push(join(homedir(), '.npm', '_npx'));

	for (const cacheRoot of cacheRoots) {
		if (!existsSync(cacheRoot)) continue;
		for (const entry of readdirSync(cacheRoot)) {
			const candidate = join(
				cacheRoot,
				entry,
				'node_modules',
				'firebase-tools',
				'lib',
				'bin',
				'firebase.js'
			);
			if (existsSync(candidate)) {
				const pkgPath = join(cacheRoot, entry, 'node_modules', 'firebase-tools', 'package.json');
				if (existsSync(pkgPath)) {
					try {
						const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
						if (pkg?.version) return candidate;
					} catch {
						// ignore incomplete cache entries
					}
				}
			}
		}
	}
	return null;
}

function resolveCommand(args) {
	const localBin = resolve(
		ROOT,
		'node_modules/.bin',
		process.platform === 'win32' ? 'firebase.cmd' : 'firebase'
	);
	if (existsSync(localBin)) {
		if (process.platform === 'win32') {
			return {
				cmd: process.env.ComSpec || 'cmd.exe',
				cmdArgs: ['/c', localBin, ...args]
			};
		}
		return { cmd: localBin, cmdArgs: args };
	}

	const cachedJs = findCachedFirebaseBin();
	if (cachedJs) {
		return { cmd: process.execPath, cmdArgs: [cachedJs, ...args] };
	}

	const npxArgs = [
		'--yes',
		'--engine-strict=false',
		`firebase-tools@${FIREBASE_CLI_VERSION}`,
		...args
	];
	if (process.platform === 'win32') {
		return {
			cmd: process.env.ComSpec || 'cmd.exe',
			cmdArgs: ['/c', 'npx', ...npxArgs]
		};
	}
	return { cmd: 'npx', cmdArgs: npxArgs };
}

export function runFirebaseCli(args, options = {}) {
	return new Promise((resolvePromise, rejectPromise) => {
		const { cmd, cmdArgs } = resolveCommand(args);
		const child = spawn(cmd, cmdArgs, {
			cwd: options.cwd ?? ROOT,
			stdio: options.stdio ?? 'inherit',
			env: {
				...process.env,
				npm_config_engine_strict: 'false',
				FIREBASE_CLI_EXPERIMENTS: 'webframeworks',
				...(options.env ?? {})
			}
		});
		child.on('error', rejectPromise);
		child.on('exit', (code) => {
			if (code === 0) {
				resolvePromise(0);
			} else {
				rejectPromise(new Error(`firebase-cli exited with code ${code ?? 'unknown'}`));
			}
		});
	});
}

export async function execInEmulators(only, command, options = {}) {
	const basePorts = getEmulatorPorts();
	const services = only
		.split(',')
		.map((s) => s.trim())
		.filter((name) => name === 'auth' || name === 'database');

	let needsEphemeralConfig = !(await isPortFree(4400)) || !(await isPortFree(4500));
	if (!needsEphemeralConfig) {
		for (const name of services) {
			if (!(await isPortFree(basePorts[name]))) {
				needsEphemeralConfig = true;
				break;
			}
		}
	}

	const project = options.project ?? 'demo-islands-of-nonsense';
	if (!needsEphemeralConfig) {
		return runFirebaseCli(
			['emulators:exec', '--project', project, '--only', only, command],
			options
		);
	}

	const firebaseJsonPath = resolve(ROOT, 'firebase.json');
	const baseConfig = existsSync(firebaseJsonPath)
		? JSON.parse(readFileSync(firebaseJsonPath, 'utf8'))
		: {};
	const nextEmulators = {
		...(baseConfig.emulators ?? {}),
		hub: { port: await findFreePort() },
		logging: { port: await findFreePort() },
		ui: { enabled: false }
	};
	if (services.includes('auth')) {
		nextEmulators.auth = { ...(nextEmulators.auth ?? {}), port: await findFreePort() };
	}
	if (services.includes('database')) {
		nextEmulators.database = { ...(nextEmulators.database ?? {}), port: await findFreePort() };
	}

	const tempDir = resolve(tmpdir(), `ion-firebase-${process.pid}-${Date.now()}`);
	mkdirSync(tempDir, { recursive: true });
	const tempConfigPath = resolve(tempDir, 'firebase.json');
	const normalizedConfig = {
		...baseConfig,
		database: baseConfig.database?.rules
			? { ...baseConfig.database, rules: resolve(ROOT, baseConfig.database.rules) }
			: { rules: resolve(ROOT, 'database.rules.json') },
		emulators: nextEmulators
	};
	writeFileSync(tempConfigPath, JSON.stringify(normalizedConfig, null, 2), 'utf8');

	try {
		return await runFirebaseCli(
			['emulators:exec', '--config', tempConfigPath, '--project', project, '--only', only, command],
			options
		);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
}
