import assert from 'assert';
import type {
	Test,

	/* NOT FOR BROWSER ONLY */

	SimplePage,
} from '@bhsd/test-util';

/* NOT FOR BROWSER ONLY */

import Parser from '../index';
import lsp from './lsp';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import {prepare} from '../script/util';

prepare(Parser);

/**
 * 合并`wpb-list`元素
 * @param html HTML字符串
 */
const merge = (html: string): string =>
	html.replaceAll('</span><span class="wpb-list">', '');

/* NOT FOR BROWSER END */

/* PRINT ONLY */

Parser.internal = true;

const entities = {lt: '<', gt: '>', amp: '&'};

/**
 * 移除HTML标签
 * @param str HTML字符串
 */
const deprint = (str: string): string => str.replace(
	/<[^<]+?>|&([lg]t|amp);/gu,
	(_, s?: keyof typeof entities) => s ? entities[s] : '',
);

/**
 * HTML字符串分行
 * @param str HTML字符串
 */
const split = (str: string): string[] => str
	.replace(/(?:<span class="wpb-list">[^<]+<\/span>)+/gu, merge)
	.split(/(?<=<\/\w+>)(?!$)|(?<!^)(?=<\w)/u);

/* PRINT ONLY END */

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, title = 'Parser test', wikitext, print, render} of tests) {
		if (wikitext && (print || render)) {
			it(desc, () => {
				/* NOT FOR BROWSER */

				Parser.viewOnly = false;

				assert.strictEqual(
					tests.filter(({desc: d}) => d === desc).length,
					1,
					`测试用例描述重复：${desc}`,
				);

				/* NOT FOR BROWSER END */

				const root = Parser.parse(wikitext, title),
					tidied = wikitext.replaceAll('\0', '');

				/* NOT FOR BROWSER */

				root.buildLists();

				/* NOT FOR BROWSER END */

				try {
					assert.strictEqual(
						root.toString(),
						tidied,
						'解析过程中不可逆地修改了原始文本！',
					);

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

					/* PRINT ONLY END */

					/* NOT FOR BROWSER */

					if (render) {
						assert.deepStrictEqual(split(root.toHtml()), split(render));
					}

					/* NOT FOR BROWSER END */
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
					/* NOT FOR BROWSER */

					Parser.viewOnly = true;

					/* NOT FOR BROWSER END */

					await lsp({title, content: wikitext} as SimplePage, true, true);
				});
			}
		}
	}
});
