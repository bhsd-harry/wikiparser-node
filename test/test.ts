import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import {info, error} from '../util/diff';
import Parser = require('../index');

Parser.warning = false;
const title = process.argv[2]?.toLowerCase();
let enCodes: string[] | undefined;

for (const file of fs.readdirSync(path.join(__dirname, '..', '..', 'wiki'))) {
	const lcFile = file.toLowerCase();
	if (file.endsWith('.md') && (!title || (title.endsWith('.md') ? lcFile === title : lcFile.includes(title)))) {
		const md = fs.readFileSync(path.join(__dirname, '..', '..', 'wiki', file), 'utf8'),
			codes = [...md.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)]
				.map(([code]) => code.replace(/[ \n]\/\/ .*$/gmu, ''));
		let logging = true;
		for (const code of codes) {
			const lines = code.split('\n') as [string, ...string[]],
				[first] = lines;
			if (
				first.endsWith(' (browser)')
			) {
				continue;
			} else if (logging) {
				info(file);
				logging = false;
			}
			try {
				Parser.i18n = undefined;
				Parser.conversionTable.clear();
				Parser.redirects.clear();
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
		if (!title) {
			if (file.endsWith('-(EN).md')) {
				enCodes = codes;
			} else if (enCodes) {
				for (const [i, code] of codes.entries()) {
					assert.strictEqual(code, enCodes[i], `${file} is different from its English version`);
				}
				enCodes = undefined;
			}
		}
	}
}
