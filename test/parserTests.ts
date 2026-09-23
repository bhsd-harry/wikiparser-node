import assert from 'assert';
import {describe, it} from '@bhsd/test-util/mocha';
import type {Test as TestBase} from '@bhsd/test-util/parser';
import type {
	LintError,

	/* NOT FOR BROWSER ONLY */

	LintRuleConfig,
} from '../base';

export interface Test extends TestBase {
	title?: string | undefined;
	html?: string;
	render?: string;
	print?: string;
	lint?: LintError[];
}

/* NOT FOR BROWSER ONLY */

import Parser from '../index';
import lsp from './lsp';
import type {SimplePage} from '@bhsd/test-util';

Object.assign(Parser, {
	lintConfig: {
		rules: {
			'invalid-css': 0,
			'invalid-math': 0,
		} satisfies LintRuleConfig,
	},
});

/* NOT FOR BROWSER ONLY END */

/* PRINT ONLY */

Parser.internal = true;

const entities = {lt: '<', gt: '>', amp: '&'};

/**
 * 移除HTML标签
 * @param str HTML字符串
 */
const deprint = (str: string): string => str.replaceAll(
	/<[^<]+?>|&([lg]t|amp);/gu,
	(_, s?: keyof typeof entities) => s ? entities[s] : '',
);

/**
 * HTML字符串分行
 * @param str HTML字符串
 */
const split = (str: string): string[] => str
	.split(/(?<=<\/\w+>)(?!$)|(?<!^)(?=<\w)/u);

/* PRINT ONLY END */

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, title = 'Parser test', wikitext, print, render, lint} of tests) {
		if (wikitext && (print || render)) {
			it(desc, () => {
				const root = Parser.parse(wikitext, title),
					tidied = wikitext.replaceAll('\0', '');
				try {
					assert.strictEqual(
						root.toString(),
						tidied,
						'解析过程中不可逆地修改了原始文本！',
					);

					if (lint) {
						assert.deepStrictEqual(root.lint(), lint);
					}

					/* PRINT ONLY */

					if (print) {
						const printed = root.print();
						assert.strictEqual(
							deprint(printed),
							tidied,
							'高亮过程中不可逆地修改了原始文本！',
						);
						assert.deepStrictEqual(split(printed), split(print));
					}
				} catch (e) {
					if (e instanceof assert.AssertionError) {
						e.cause = {message: `\n${wikitext}`};
					}
					throw e;
				}
			});

			/* NOT FOR BROWSER ONLY */

			if (process.env['LSP'] !== '0') {
				it(`LSP: ${desc}`, async () => {
					await lsp({title, content: wikitext} as SimplePage, true, true);
				});
			}
		}
	}
});
