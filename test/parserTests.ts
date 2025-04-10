import Parser from '../index';
import {getConfig} from './translate';

declare interface Test {
	desc: string;
	wikitext?: string;
	print?: string;
	render?: string;
}

const config = getConfig(Parser);

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, wikitext, print, render} of tests) {
		if (
			wikitext && (print || render)
		) {
			it(desc, () => {
				Parser.parse(wikitext, false, undefined, config);
			});
		}
	}
});
