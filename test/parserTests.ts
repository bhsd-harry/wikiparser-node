import * as assert from 'assert/strict';
import Parser = require('../index');

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
			wikitext && (print || /* istanbul ignore next */ render)
		) {
			it(desc, () => {
				const root =
					Parser.parse(wikitext);
				try {
					if (print) {
						assert.deepStrictEqual(split(root.print()), split(print));
					}
				} catch (e) /* istanbul ignore next */ {
					if (e instanceof assert.AssertionError) {
						e.cause = {message: `\n${wikitext}`};
					}
					throw e;
				}
			});
		}
	}
});
