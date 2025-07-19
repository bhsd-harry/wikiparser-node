import assert from 'assert';
import Parser from '../index';
import type {Test} from '@bhsd/test-util';

/* PRINT ONLY */

/**
 * HTML字符串分行
 * @param str HTML字符串
 */
const split = (str: string): string[] => str
	.split(/(?<=<\/\w+>)(?!$)|(?<!^)(?=<\w)/u);

/* PRINT ONLY END */

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, wikitext, print, render} of tests) {
		if (
			wikitext && (print || render)
		) {
			it(desc, () => {
				const root = Parser.parse(wikitext);
				try {
					assert.deepStrictEqual(
						root.toString(),
						wikitext.replaceAll('\0', ''),
						'解析过程中不可逆地修改了原始文本！',
					);
					if (print) {
						assert.deepStrictEqual(split(root.print()), split(print));
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
