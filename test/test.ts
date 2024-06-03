import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import {info, error} from '../util/diff';
import Parser = require('../index');

const title = process.argv[2]?.toLowerCase();

for (const file of fs.readdirSync(path.join(__dirname, '..', '..', 'wiki'))) {
	const lcFile = file.toLowerCase();
	if (file.endsWith('.md') && (!title || (title.endsWith('.md') ? lcFile === title : lcFile.includes(title)))) {
		const md = fs.readFileSync(path.join(__dirname, '..', '..', 'wiki', file), 'utf8');
		let logging = true;
		// eslint-disable-next-line es-x/no-string-prototype-matchall, es-x/no-regexp-lookbehind-assertions
		for (const [code] of md.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)) {
			const lines = code.split('\n') as [string, ...string[]],
				[first] = lines;
			if (
				first.endsWith(' (main)') || /^\/\/ (?:print|json)(?!\S)/u.test(first)
			) {
				continue;
			} else if (logging) {
				info(file);
				logging = false;
			}
			try {
				Parser.i18n = undefined;
				eval(code); // eslint-disable-line no-eval
				if (code.includes('Parser.config = ')) {
					Parser.config = 'default';
				}
			} catch (e) {
				error(code);
				if (e instanceof assert.AssertionError) {
					e.cause = lines[Number(/<anonymous>:(\d+)/u.exec(e.stack!)![1]) - 1];
				}
				throw e;
			}
		}
	}
}
