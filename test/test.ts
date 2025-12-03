import fs from 'fs';
import path from 'path';
import * as assert from 'assert';
import Parser = require('../index');
import type {
	LintError,
	LintRuleConfig,
} from '../base';
import type {LintConfiguration} from '../lib/lintConfig';

const re = /\*\*((?:in)?correct)\*\* .+ `(\{[^`]+\})`:((?:\n+```wikitext\n[^`]+\n```)+)$/gmu;

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
					Parser.i18n = 'en';
					Parser.lintConfig = undefined as unknown as LintConfiguration;

					/* PRINT ONLY */

					Parser.internal = false;

					/* PRINT ONLY */

					if (typeof Parser.config === 'object') {
						Object.assign(Parser.config, {articlePath: '/wiki/$1'});
					}
				});
				for (const code of testCodes) {
					const lines = code.split('\n') as [string, ...string[]],
						[first] = lines;
					if (
						/ \(browser\)/u.test(first)
						|| / \(self\)/u.test(first)
					) {
						it.skip(first.slice(3));
					} else {
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

				/* PRINT ONLY */

				Parser.internal = true;

				/* PRINT ONLY */

				const cur = file.slice(0, -3) as LintError.Rule;
				for (const code of md.matchAll(re)) {
					const [, state, config, wikitext] = code as string[] as [string, string, string, string];
					it(config, () => {
						const rules: LintRuleConfig = JSON.parse(config);
						Parser.lintConfig = {
							rules,
							fix: false,
							computeEditInfo: false,
							ignoreDisables: true,
						} as LintConfiguration;
						for (const [block] of wikitext.matchAll(/(?<=```wikitext\n)[^`]+(?=\n```)/gu)) {
							try {
								assert.strictEqual(
									state === 'incorrect',
									Parser.parse(block).lint()
										.some(({rule, severity}) => rule === cur && severity === 'error'),
									`${state === 'incorrect' ? 'No' : 'An'} error found!`,
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
			});
		}
	}
});
