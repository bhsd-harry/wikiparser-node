import Parser from '../index';
import type {Test} from '@bhsd/common/dist/test';

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
