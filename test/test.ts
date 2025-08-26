import fs from 'fs';
import path from 'path';
import * as assert from 'assert';
import {mock} from './wikiparse';
import type {
	LintError,
	Parser as ParserBase,
} from '../base';
import type {LintConfiguration} from '../lib/lintConfig';

declare const Parser: ParserBase;
Parser.config = require('../../config/default');
wikiparse.setConfig(Parser.config);

const re = /`(\{[^`]+\})`:((?:\n+```wikitext\n[^`]+\n```)+)$/gmu;

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
			describe(file, () => {
				beforeEach(() => {
					Parser.i18n = undefined;
					// @ts-expect-error extended interface
					Parser.lintConfig = {} as LintConfiguration;
					if (typeof Parser.config === 'object') {
						// @ts-expect-error delete readonly property
						delete Parser.config.articlePath;
					}
					wikiparse.setI18N();
					wikiparse.setLintConfig();
				});
				for (const code of testCodes) {
					const lines = code.split('\n') as [string, ...string[]],
						[first] = lines;
					if (/^\/\/ (?:config|i18n)(?!\S)| \(main\)| \(Node\.js\)/u.test(first)) {
						it.skip(first.slice(3));
					} else {
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
				const cur = file.slice(0, -3);
				if (cur !== 'invalid-css') {
					for (const code of md.matchAll(re)) {
						const [, config, wikitext] = code as string[] as [string, string, string];
						it(config, () => {
							const lintConfig = JSON.parse(config);
							Parser.lintConfig = lintConfig;
							for (const [block] of wikitext.matchAll(/(?<=```wikitext\n)[^`]+(?=\n```)/gu)) {
								try {
									assert.strictEqual(
										// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
										typeof lintConfig[cur] === 'number'
										// @ts-expect-error method of LintConfiguration
										=== (Parser.lintConfig.getSeverity(cur as LintError.Rule) === 'error'),
										Parser.parse(block).lint()
											.some(({rule, severity}) => rule === cur && severity === 'error'),
									);
								} catch (e) {
									if (e instanceof assert.AssertionError) {
										e.cause = {message: `\n${block}`};
									}
									throw e;
								}
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
