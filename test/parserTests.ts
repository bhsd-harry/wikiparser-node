import assert from 'assert';
import Parser from '../index';
import type {Test} from '@bhsd/test-util';

/* PRINT ONLY */

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
	.split(/(?<=<\/\w+>)(?!$)|(?<!^)(?=<\w)/u);

/* PRINT ONLY END */

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, title, wikitext, print, render} of tests) {
		if (wikitext && (print || render)) {
			it(desc, () => {
				const root = Parser.parse(wikitext, title!),
					tidied = wikitext.replaceAll('\0', '');
				try {
					assert.strictEqual(
						root.toString(),
						tidied,
						'解析过程中不可逆地修改了原始文本！',
					);
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
		}
	}
});
