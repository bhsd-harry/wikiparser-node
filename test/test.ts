import fs from 'fs';
import path from 'path';
import * as assert from 'assert';
import ParserBase from '../../bundle/bundle.min.js'; // eslint-disable-line n/no-missing-import

const Parser = ParserBase;
Parser.config = require('../../config/default');

const md = fs.readFileSync(path.resolve('test', 'test.md'), 'utf8');
for (const section of md.split(/^## /mu).slice(1)) {
	describe(section.slice(0, section.indexOf('\n')), () => {
		const codes = [...section.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)]
			.map(([code]) => code.replace(/[ \n]\/\/ .*$/gmu, ''));
		for (const code of codes) {
			const lines = code.split('\n') as [string, ...string[]],
				[first] = lines;
			it(first.slice(3), async () => {
				try {
					await eval(code); // eslint-disable-line no-eval
				} catch (e) {
					if (e instanceof assert.AssertionError) {
						const start = Number(/<anonymous>:(\d+)/u.exec(e.stack!)![1]) - 1,
							end = lines
								.findIndex((line, i) => i >= start && line.endsWith(';'));
						e.cause = {
							message: `\n${lines.slice(start, end + 1 || Infinity).join('\n')}`,
						};
					}
					throw e;
				}
			});
		}
	});
}
