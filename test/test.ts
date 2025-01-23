import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import type {Parser as ParserBase} from '../base';

declare const Parser: ParserBase;
Parser.config = require('../../config/default');

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
						!first.endsWith(' (main)') && !/^\/\/ (?:config|i18n)(?!\S)/u.test(first)
					) {
						it(first.slice(3), () => {
							try {
								eval(code); // eslint-disable-line no-eval
								if (code.includes('Parser.config = ')) {
									Parser.config = require('../../config/default');
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
