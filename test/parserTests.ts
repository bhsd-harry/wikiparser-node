import Parser from '../index';

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
				Parser.parse(wikitext);
			});
		}
	}
});
