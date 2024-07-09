import * as assert from 'assert/strict';
import {diff} from '../util/diff';
import Parser = require('../index');

const tests: {wikitext?: string, print?: string}[] = require('../../test/parserTests.json');
(async () => {
	let failed = 0;
	for (const [i, {wikitext, print}] of tests.entries()) {
		if (wikitext && print) {
			try {
				assert.equal(Parser.parse(wikitext).print(), print);
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
