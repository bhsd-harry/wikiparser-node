import * as assert from 'assert/strict';
import {diff} from '../util/diff';
import Parser = require('../index');

declare interface Test {
	wikitext?: string;
	print?: string;
	render?: string;
}

const tests: Test[] = require('../../test/parserTests.json');
(async () => {
	let failed = 0;
	for (const [i, {wikitext, print, render}] of tests.entries()) {
		if (wikitext && (print || render)) {
			const root = Parser.parse(wikitext);
			try {
				assert.equal(root.print(), print);
			} catch (e) {
				console.log(wikitext);
				console.log();
				if (e instanceof assert.AssertionError) {
					await diff(e.expected as string, e.actual as string, i);
				}
				failed++;
			}
		}
	}
	if (failed) {
		throw new Error(`${failed} tests failed!`);
	}
})();
