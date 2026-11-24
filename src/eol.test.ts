// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

/**
 * Індекс і робоче дерево читають ОДИН І ТОЙ САМИЙ текст
 * (AI-AGENT-PITFALLS-v10 § 1.5, `PIT-EOL-GATE`, HIGH).
 */

const ROW = /^i\/(\S+)\s+w\/(\S+)\s+attr\/[^\t]*\t(.+)$/;

interface Entry {
	index: string;
	work: string;
	path: string;
}

function trackedFiles(): Entry[] {
	const out = execFileSync('git', ['ls-files', '--eol'], {
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024
	});

	const entries: Entry[] = [];
	for (const line of out.split('\n')) {
		const match = ROW.exec(line.replace(/\r$/, ''));
		if (match) entries.push({ index: match[1] ?? '', work: match[2] ?? '', path: match[3] ?? '' });
	}
	return entries;
}

const entries = trackedFiles();
const text = entries.filter((e) => !(e.index === '-text' && e.work === '-text'));

describe('закінчення рядків (AI-AGENT-PITFALLS-v10 § 1.5)', () => {
	it('перевірка жива: git віддав перелік відстежуваних файлів', () => {
		expect(text.length, 'git ls-files не віддав дерево — перевіряти нема що').toBeGreaterThan(0);
		const paths = new Set(entries.map((e) => e.path));
		expect(
			['package.json', '.gitattributes'].filter((root) => !paths.has(root)),
			'у переліку немає файлів кореня: git запущено з підкаталогу, і перевірка бачить частину дерева'
		).toEqual([]);
	});

	it('перевірка жива: у переліку є і .svelte, і .ts', () => {
		const kinds = ['.svelte', '.ts'].filter((ext) => text.some((e) => e.path.endsWith(ext)));
		expect(kinds, 'у переліку немає джерел проєкту — розбір рядка зламався').toEqual([
			'.svelte',
			'.ts'
		]);
	});

	it('в індексі немає CRLF — інакше CRLF поїде в CI', () => {
		const committed = text.filter((e) => e.index === 'crlf' || e.index === 'mixed');
		expect(
			committed.map((e) => `${e.path} (i/${e.index})`),
			'у git закомічено CRLF: `.gitattributes` не діяв на момент додавання цих файлів'
		).toEqual([]);
	});

	it('.gitattributes дає text і eol=lf кожному текстовому файлу, який читають гейти', () => {
		const sources = text
			.map((e) => e.path)
			.filter((p) => /\.(?:[cm]?[jt]s|svelte|json|css|html|md|ya?ml)$/.test(p));
		expect(
			sources.length,
			'у переліку немає джерел — атрибут перевіряти нема на чому'
		).toBeGreaterThan(0);

		const out = execFileSync('git', ['check-attr', '-z', '--stdin', 'text', 'eol'], {
			input: sources.join('\0'),
			encoding: 'utf8',
			maxBuffer: 32 * 1024 * 1024
		});
		const parts = out.split('\0');
		const attrs = new Map<string, Record<string, string>>();
		for (let i = 0; i + 2 < parts.length; i += 3) {
			const path = parts[i] ?? '';
			attrs.set(path, { ...attrs.get(path), [parts[i + 1] ?? '']: parts[i + 2] ?? '' });
		}
		const bad = [...attrs]
			.filter(([, a]) => !(a.text === 'auto' || a.text === 'set') || a.eol !== 'lf')
			.map(([path, a]) => `${path}: text=${a.text ?? '?'} eol=${a.eol ?? '?'}`);
		expect(
			bad,
			`.gitattributes не нормалізує до LF — потрібен \`* text=auto eol=lf\` (AI-AGENT-PITFALLS-v10 § 1.5):\n${bad.slice(0, 20).join('\n')}`
		).toEqual([]);
	});
});
