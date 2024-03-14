import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import Parser = require('../index');

Object.assign(Parser, {assert});
const title = process.argv[2]?.toLowerCase();

for (const file of fs.readdirSync(path.join(__dirname, '..', '..', 'wiki'))) {
	const lcFile = file.toLowerCase();
	if (file.endsWith('.md') && (!title || (title.endsWith('.md') ? lcFile === title : lcFile.includes(title)))) {
		Parser.info(file);
		const md = fs.readFileSync(path.join(__dirname, '..', '..', 'wiki', file), 'utf8');
		// eslint-disable-next-line es-x/no-string-prototype-matchall, es-x/no-regexp-lookbehind-assertions
		for (const [code] of md.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)) {
			if (code.split('\n', 1)[0]!.endsWith(' (browser)')) {
				continue;
			}
			try {
				Parser.i18n = undefined;
				eval(code); // eslint-disable-line no-eval
				if (code.includes('Parser.config = ')) {
					Parser.config = 'default';
				}
			} catch (e) {
				Parser.error(code);
				throw e;
			}
		}
	}
}
