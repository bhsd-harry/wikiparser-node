'use strict';

const fs = require('fs'),
	assert = require('assert'),
	path = require('path'),
	Parser = require('..');
Parser.config = require('../config/default');

const wikitext = fs.readFileSync(path.join(__dirname, 'single-page.txt'), 'utf8'),
	token = Parser.parse(wikitext);
let restored = String(token),
	process = '解析';
if (restored === wikitext) {
	const entities = {lt: '<', gt: '>', amp: '&'};
	restored = token.print().replaceAll(
		/<[^<]+?>|&([lg]t|amp);/gu,
		/** @param {string} s */ (_, s) => s ? entities[s] : '',
	);
	process = '渲染HTML';
}
if (restored !== wikitext) {
	throw new Error(`${process}过程中不可逆地修改了原始文本！`);
}
assert.deepStrictEqual(token.lint(), []);
