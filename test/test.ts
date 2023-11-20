import * as fs from 'fs/promises';
import * as path from 'path';
import * as assert from 'assert'; // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
import Parser = require('../index');

const {argv: [,, title = '']} = process;
Parser.debugging = true;

(async () => {
	var wikitext = ''; // eslint-disable-line no-var, @typescript-eslint/no-unused-vars, no-unused-vars
	for (const file of await fs.readdir(path.join(__dirname, '../wiki'))) {
		if (file.endsWith('.md') && file.toLowerCase().includes(title.toLowerCase())) {
			Parser.debug(file);
			const md = await fs.readFile(path.join(__dirname, '../wiki', file), 'utf8');
			for (const [, code] of md.matchAll(/```js\n(.*?)\n```/gsu)) {
				try {
					Parser.config = 'default';
					delete Parser.i18n;
					eval(code!); // eslint-disable-line no-eval
				} catch (e) {
					Parser.error(code!);
					throw e;
				}
			}
		}
	}
})();
