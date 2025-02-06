import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import Parser = require('../index');

describe('API tests', () => {
	for (const file of fs.readdirSync(path.join(__dirname, '..', '..', 'wiki'))) {
		if (file.endsWith('.md')) {
			const md = fs.readFileSync(path.join(__dirname, '..', '..', 'wiki', file), 'utf8'),
				codes = [...md.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)]
					.map(([code]) => code.replace(/[ \n]\/\/ .*$/gmu, ''));
			describe(file, () => {
				beforeEach(() => {
					Parser.i18n = undefined;
				});
				for (const code of codes) {
					const lines = code.split('\n') as [string, ...string[]],
						[first] = lines;
					if (
						!first.endsWith(' (main)') && !/^\/\/ (?:print|json)(?!\S)/u.test(first)
					) {
						it(first.slice(3), async () => {
							try {
								await eval(code); // eslint-disable-line no-eval
								if (typeof Parser.config === 'object') {
									// @ts-expect-error delete readonly property
									delete Parser.config.articlePath;
								}
								if (code.includes('Parser.config = ')) {
									Parser.config = 'default';
								}
							} catch (e) /* istanbul ignore next */ {
								if (e instanceof assert.AssertionError) {
									e.cause = {message: lines[Number(/<anonymous>:(\d+)/u.exec(e.stack!)![1]) - 1]};
								}
								throw e;
							}
						});
					}
				}
			});
		}
	}
});
