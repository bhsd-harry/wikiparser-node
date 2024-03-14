import * as assert from 'assert/strict';
import {diff} from '../util/diff';
import Parser from '../index';

const tests: {wikitext: string, print: string}[] = require('wikiparser-node/test/parserTests.json');
(async () => {
	for (const [i, {wikitext, print}] of tests.entries()) {
		try {
			assert.equal(Parser.parse(wikitext).print(), print);
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				console.log(wikitext);
				await diff(e.actual as string, e.expected as string, i); // eslint-disable-line no-await-in-loop
			}
		}
	}
})();
