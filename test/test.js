'use strict';
/* eslint-disable no-var */
const fs = require('fs/promises'),
	assert = require('assert'), // eslint-disable-line no-unused-vars
	path = require('path');

var Parser = require('..');
var wikitext = ''; // eslint-disable-line no-unused-vars
Parser.warning = false;

(async () => {
	const list = await fs.readdir(path.join(__dirname, '../wiki'));
	for (const file of list) {
		if (file.endsWith('.md')) {
			const md = await fs.readFile(path.join(__dirname, '../wiki', file), 'utf8');
			for (const [, code] of md.matchAll(/```js\n(.+?)\n```/gsu)) {
				try {
					eval(code); // eslint-disable-line no-eval
				} catch (e) {
					Parser.info(file);
					Parser.error(code);
					throw e;
				}
			}
		}
	}
})();
