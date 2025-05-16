import fs from 'fs';
import path from 'path';
import * as assert from 'assert';
import Parser = require('../index');

/* NOT FOR BROWSER */

import type {Config} from '../base';
import type {Token} from '../internal';

if (process.env['CLONENODE']) {
	const parse = Parser.parse.bind(Parser);
	Parser.parse = /** @implements */ (...args: [string, boolean?, number?, Config?]): Token =>
		parse(...args).cloneNode();
}

/* NOT FOR BROWSER END */

Parser.warning = false;
const allCodes = new Map<string, string[]>();

/**
 * Mock CRLF
 * @param str LF string
 */
const mockCRLF = (str: string): string => str.replaceAll('\n', '\\r\n');

describe('API tests', () => {
	for (const file of fs.readdirSync(path.resolve('wiki'))) {
		if (file.endsWith('.md')) {
			const md = fs.readFileSync(path.resolve('wiki', file), 'utf8'),
				codes = [...md.matchAll(/(?<=```js\n).*?(?=\n```)/gsu)]
					.map(([code]) => code.replace(/[ \n]\/\/ .*$/gmu, '')),
				testCodes = file.startsWith('LanguageService')
					? codes.flatMap(code => [
						code,
						code.replace(/(?<=\bwikitext = `).+?(?=`)/gsu, mockCRLF)
							.replace('\n', ' (CRLF)\n'),
					])
					: codes;
			allCodes.set(file.slice(0, -3), codes);
			describe(file, () => {
				beforeEach(() => {
					Parser.viewOnly = false;
					Parser.i18n = undefined;
					Parser.conversionTable.clear();
					Parser.redirects.clear();
					if (typeof Parser.config === 'object') {
						Parser.config.interwiki.length = 0;
						// @ts-expect-error delete readonly property
						delete Parser.config.articlePath;
					}
				});
				for (const code of testCodes) {
					const lines = code.split('\n') as [string, ...string[]],
						[first] = lines;
					if (!/ \(browser\)/u.test(first)) {
						it(first.slice(3), async () => {
							try {
								await eval(code); // eslint-disable-line no-eval
								if (code.includes('Parser.config = ')) {
									Parser.config = 'default';
								}
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
				const zhCodes = allCodes.get(zhFile)!;
				for (let i = 0; i < zhCodes.length; i++) {
					const code = zhCodes[i]!;
					it(code.split('\n', 1)[0]!.slice(3), () => {
						assert.strictEqual(
							code,
							enCodes[i],
							`${zhFile} is different from its English version`,
						);
					});
				}
			});
		}
	}
});
