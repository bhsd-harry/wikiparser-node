import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import Parser = require('../index');

const {argv: [,, title = '']} = process;
Parser.debugging = true;
Object.assign(Parser, {assert});

for (const file of fs.readdirSync(path.join(__dirname, '..', '..', 'wiki'))) {
	if (file.endsWith('.md') && file.toLowerCase().includes(title.toLowerCase())) {
		Parser.debug(file);
		const md = fs.readFileSync(path.join(__dirname, '..', '..', 'wiki', file), 'utf8');
		for (const [code] of md.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)) {
			try {
				Parser.config = 'default';
				delete Parser.i18n;
				Parser.conversionTable.clear();
				Parser.redirects.clear();
				eval(code); // eslint-disable-line no-eval
			} catch (e) {
				Parser.error(code);
				throw e;
			}
		}
	}
}
