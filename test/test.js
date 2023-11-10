/* eslint-disable no-var */
'use strict';
const fs = require('fs/promises'),
	assert = require('assert'), // eslint-disable-line no-unused-vars
	path = require('path');

var {Parser} = require('..');
var wikitext = ''; // eslint-disable-line no-unused-vars
const {argv: [,, title = '']} = process;
Parser.debugging = true;

(async () => {
	const list = await fs.readdir(path.join(__dirname, '../wiki'));
	for (const file of list) {
		if (file.endsWith('.md') && file.toLowerCase().includes(title.toLowerCase())) {
			Parser.debug(file);
			const md = await fs.readFile(path.join(__dirname, '../wiki', file), 'utf8');
			for (const [, code] of md.matchAll(/```js\n(.*?)\n```/gsu)) {
				try {
					Parser.config = './config/default';
					Parser.i18n = undefined;
					eval(code); // eslint-disable-line no-eval
				} catch (e) {
					Parser.error(code);
					throw e;
				}
			}
		}
	}
})();
