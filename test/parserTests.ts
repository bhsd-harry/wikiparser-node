import * as assert from 'assert/strict';
import Parser = require('../index');

declare interface Test {
	desc: string;
	wikitext?: string;
	print?: string;
	render?: string;
}

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, wikitext, print, render} of tests) {
		if (
			wikitext && (print || render)
		) {
			it(desc, () => {
				const root = Parser.parse(wikitext);
				try {
					if (print) {
						assert.equal(root.print(), print);
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
