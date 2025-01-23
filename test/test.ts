import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import Parser = require('../index');

Parser.warning = false;
const allCodes = new Map<string, string[]>();

describe('API tests', () => {
	for (const file of fs.readdirSync(path.join(__dirname, '..', '..', 'wiki'))) {
		if (file.endsWith('.md')) {
			const md = fs.readFileSync(path.join(__dirname, '..', '..', 'wiki', file), 'utf8'),
				codes = [...md.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)]
					.map(([code]) => code.replace(/[ \n]\/\/ .*$/gmu, ''));
			allCodes.set(file.slice(0, -3), codes);
			describe(file, () => {
				beforeEach(() => {
					Parser.i18n = undefined;
					Parser.conversionTable.clear();
					Parser.redirects.clear();
					if (typeof Parser.config === 'object') {
						Parser.config.interwiki.length = 0;
					}
				});
				for (const code of codes) {
					const lines = code.split('\n') as [string, ...string[]],
						[first] = lines;
					if (
						!first.endsWith(' (browser)')
					) {
						it(first.slice(3), () => {
							try {
								eval(code); // eslint-disable-line no-eval
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

describe('Documentation tests', () => {
	for (const [file, enCodes] of allCodes) {
		if (file.endsWith('-(EN)')) {
			const zhFile = file.slice(0, -5);
			describe(zhFile, () => {
				for (const [i, code] of allCodes.get(zhFile)!.entries()) {
					it(code.split('\n')[0]!.slice(3), () => {
						assert.strictEqual(code, enCodes[i], `${zhFile} is different from its English version`);
					});
				}
			});
		}
	}
});
