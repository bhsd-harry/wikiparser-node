'use strict';

const fs = require('fs'),
	assert = require('assert/strict'),
	path = require('path'),
	{diff} = require('../util/diff'),
	{default: Parser} = require('..');
Parser.config = require('../config/default');

const wikitext = fs.readFileSync(path.join(__dirname, 'single-page.wiki'), 'utf8');

(async () => {
	console.time('parse');
	const token = Parser.parse(wikitext);
	console.timeEnd('parse');
	const parsed = String(token);
	if (parsed !== wikitext) {
		await diff(wikitext, parsed);
		throw new Error('解析过程中不可逆地修改了原始文本！');
	}

	console.time('print');
	const printed = token.print();
	console.timeEnd('print');
	const entities = {lt: '<', gt: '>', amp: '&'},
		restored = printed.replace(
			/<[^<]+?>|&([lg]t|amp);/gu,
			/** @param {string} s */ (_, s) => s ? entities[s] : '',
		);
	if (restored !== wikitext) {
		await diff(wikitext, restored);
		throw new Error('渲染HTML过程中不可逆地修改了原始文本！');
	}

	console.time('lint');
	const errors = token.lint();
	console.timeEnd('lint');
	assert.deepEqual(errors, []);
})();
