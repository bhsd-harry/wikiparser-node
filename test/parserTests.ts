import assert from 'assert/strict';
import type {Parser as ParserBase} from '../base';

declare const Parser: ParserBase;
Parser.config = require('../../config/default');

declare interface Test {
	desc: string;
	wikitext?: string;
	print?: string;
	render?: string;
}

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
			&& !wikitext.includes('|]]')
		) {
			it(desc, () => {
				const root =
					Parser.parse(wikitext);

				try {
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
