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

/**
 * 测试texvcjs
 * @param file 测试样例文件名（不带扩展名）
 * @param callback 测试样例整理函数
 * @param tag 测试标签
 * @param pass 是否期望测试通过（即不产生诊断）
 */
const mathTest = <T>(
	file: string,
	callback: (tests: T) => [string, string, (string | undefined)?][],
	tag = 'math',
	pass = true,
): void => {
	describe(file, () => {
		const tests: T = require(path.join('..', '..', 'test', 'texvcjs', `${file}.json`));
		for (const [inputhash, input, chem = ''] of callback(tests)) {
			it(inputhash, () => {
				assert.strictEqual(
					Parser.lint(`<${tag}${chem}>${input}</${tag}>`).length === 0,
					pass,
					input,
				);
			});
		}
	});
};

describe('texvcjs tests', () => {
	mathTest<Record<string, string>>(
		'en-wiki-formulae-bad',
		Object.entries,
		'math',
		false,
	);

	mathTest<Record<string, string>>(
		'en-wiki-formulae-good',
		Object.entries,
	);

	mathTest<{input: string, inputhash: string}[]>(
		'chem-regression',
		tests => tests.map(({input, inputhash}) => [inputhash, input]),
		'chem',
	);

	mathTest<{id: number, input: string, ignore?: true, options?: {usemhchem?: true}}[]>(
		'mathjax-texvc',
		tests => tests.filter(({ignore}) => !ignore)
			.map(({id, input, options}) => [String(id), input, options?.usemhchem && ' chem']),
	);
});
