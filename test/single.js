'use strict';

const fs = require('fs'),
	assert = require('assert'),
	path = require('path'),
	diff = require('../util/diff'),
	Parser = require('..');
Parser.config = require('../config/default');

const wikitext = fs.readFileSync(path.join(__dirname, 'single-page.txt'), 'utf8');

(async () => {
	console.time('parse');
	const token = Parser.parse(wikitext);
	console.timeEnd('parse');
	const parsed = String(token);
	if (parsed !== wikitext) {
		await diff(wikitext, parsed);
		throw new Error('解析过程中不可逆地修改了原始文本！');
	}

	console.time('lint');
	const errors = token.lint();
	console.timeEnd('lint');
	assert.deepStrictEqual(errors, []);
})();
