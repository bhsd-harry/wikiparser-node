import fs from 'fs';
import path from 'path';
import * as assert from 'assert';
import Parser = require('../index');
import type {
	LintError,
} from '../base';
import type {LintConfiguration} from '../lib/lintConfig';

const re = /`(\{[^`]+\})`:\n+```wikitext\n([^`]+)\n```$/gmu;

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
					Parser.lintConfig = {} as LintConfiguration;
					if (typeof Parser.config === 'object') {
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
				const cur = file.slice(0, -3);
				for (const code of md.matchAll(re)) {
					const [, config, wikitext] = code as string[] as [string, string, string],
						lintConfig = JSON.parse(config);
					it(config, () => {
						Parser.lintConfig = lintConfig;
						try {
							assert.strictEqual(
								Parser.lintConfig.getSeverity(cur as LintError.Rule) !== 'error',
								Parser.parse(wikitext).lint()
									.some(({rule, severity}) => rule === cur && severity === 'error'),
							);
						} catch (e) {
							if (e instanceof assert.AssertionError) {
								e.cause = {message: `\n${wikitext}`};
							}
							throw e;
						}
					});
				}
			});
		}
	}
});
