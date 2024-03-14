import * as assert from 'assert/strict';
import '../../bundle/bundle.min.js';
import type {Parser as ParserBase} from '../base';

declare const Parser: ParserBase;
Parser.config = require('../../config/default');

const tests: {wikitext: string, print: string}[] = require('wikiparser-node/test/parserTests.json');
for (const {wikitext, print} of tests) {
	assert.equal(Parser.parse(wikitext).print(), print);
}
