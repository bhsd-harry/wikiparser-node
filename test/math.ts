import path from 'path';
import * as assert from 'assert';
import Parser = require('../index');
import type {LintError} from '../base';

const {rules} = Parser.lintConfig;
for (const rule in rules) {
	if (rule !== 'invalid-math') {
		rules[rule as LintError.Rule] = 0;
	}
}

const {SOURCE} = process.env;

/**
 * 测试texvcjs
 * @param file 测试样例文件名（不带扩展名）
 * @param callback 测试样例整理函数
 * @param tag 测试标签
 * @param pass 是否期望测试通过（即不产生诊断）
 */
const texTest = <T>(
	file: string,
	callback: (tests: T) => [string, string, (string | undefined)?, boolean?, string?][],
	tag = 'math',
	pass = true,
): void => {
	describe(file, () => {
		const tests: T = require(path.join('..', '..', 'test', 'math', `${file}.json`));
		for (const [inputhash, input, chem = '', result = pass, tagOverride = tag] of callback(tests)) {
			it(inputhash, () => {
				assert.strictEqual(
					Parser.lint(`<${tagOverride}${chem}>${input}</${tagOverride}>`).length === 0,
					result,
					`should ${result ? '' : 'not '}pass: ${input}`,
				);
			});
		}
	});
};

/**
 * Extension:Math测试
 * @param file 测试样例文件名（不带扩展名）
 */
const mathTest = (file: string): void => {
	texTest<{tex: string, type: string, mmlMathoid?: string}[]>(
		file,
		tests => tests.map(({tex, type, mmlMathoid}) => {
			const isChem = type === 'chem',
				hasCe = tex.includes(String.raw`\\ce{`);
			return [tex, tex, isChem && hasCe ? ' chem' : '', mmlMathoid !== '', isChem && !hasCe ? 'chem' : 'math'];
		}),
	);
};

if (!SOURCE || SOURCE === 'texvcjs') {
	describe('texvcjs tests', () => {
		texTest<Record<string, string>>('en-wiki-formulae-bad', Object.entries, 'math', false);

		texTest<Record<string, string>>('en-wiki-formulae-good', Object.entries);

		texTest<{input: string, inputhash: string}[]>(
			'chem-regression',
			tests => tests.map(({input, inputhash}) => [inputhash, input]),
			'chem',
		);

		texTest<{id: number, input: string, ignore?: true, options?: {usemhchem?: true}}[]>(
			'mathjax-texvc',
			tests => tests.filter(({ignore}) => !ignore)
				.map(({id, input, options}) => [String(id), input, options?.usemhchem && ' chem']),
		);
	});
}

if (!SOURCE || SOURCE === 'math') {
	describe('Extension:Math tests', () => {
		mathTest('TexUtil-Ref');

		mathTest('mmlRes-mathml-FullCoverage');

		mathTest('Mhchemv4mml');

		texTest<{input: string}[]>('reference', tests => tests.map(({input}) => [input, input]));

		texTest<Record<string, [string, {input: string}]>>(
			'tex-2-mml',
			tests => (Object.values(tests).flat() as unknown[] as [string, {input: string}][])
				.map(([inputhash, {input}]) => [inputhash, input]),
		);
	});
}
