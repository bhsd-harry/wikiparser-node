import * as assert from 'assert/strict';
import Parser from '../index';

const tests: {wikitext: string, print: string}[] = require('wikiparser-node/test/parserTests.json');
for (const {wikitext, print} of tests) {
	assert.equal(Parser.parse(wikitext).print(), print);
}
