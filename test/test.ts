import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import Parser = require('../index');

Parser.warning = false;
Object.assign(Parser, {assert});
const title = process.argv[2]?.toLowerCase();

for (const file of fs.readdirSync(path.join(__dirname, '..', '..', 'wiki'))) {
	const lcFile = file.toLowerCase();
	if (file.endsWith('.md') && (!title || (title.endsWith('.md') ? lcFile === title : lcFile.includes(title)))) {
		Parser.info(file);
		const md = fs.readFileSync(path.join(__dirname, '..', '..', 'wiki', file), 'utf8');
		// eslint-disable-next-line es-x/no-string-prototype-matchall, es-x/no-regexp-lookbehind-assertions
		for (const [code] of md.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)) {
			try {
				Parser.config = 'default';
				Parser.i18n = undefined;
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
