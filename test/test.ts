import fs from 'fs';
import path from 'path';
import * as assert from 'assert';
import {mock} from './wikiparse';
import type {Parser as ParserBase} from '../base';

declare const Parser: ParserBase;
Parser.config = require('../../config/default');
wikiparse.setConfig(Parser.config);

const allCodes = new Map<string, string[]>();

/**
 * Mock CRLF
 * @param str LF string
 */
const mockCRLF = (str: string): string => str.replaceAll('\n', '\\r\n');

describe('API tests', () => {
	for (const file of fs.readdirSync(path.join(__dirname, '..', '..', 'wiki'))) {
		if (file.endsWith('.md')) {
			const md = fs.readFileSync(path.join(__dirname, '..', '..', 'wiki', file), 'utf8'),
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
					Parser.i18n = undefined;
					if (typeof Parser.config === 'object') {
						// @ts-expect-error delete readonly property
						delete Parser.config.articlePath;
					}
					wikiparse.setI18N();
				});
				for (const code of testCodes) {
					const lines = code.split('\n') as [string, ...string[]],
						[first] = lines;
					if (!/^\/\/ (?:config|i18n)(?!\S)| \(main\)| \(Node\.js\)/u.test(first)) {
						it(first.slice(3), async () => {
							try {
								await eval(code); // eslint-disable-line no-eval
								if (code.includes('Parser.config = ')) {
									Parser.config = require('../../config/default');
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

setTimeout(() => {
	void mock.worker.terminate();
}, 2000);

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
