import fs from 'fs';
import path from 'path';
import * as assert from 'assert';
import {describe, it, beforeEach} from '@bhsd/test-util/mocha';
import type {
	LintError,
	LintRuleConfig,
	Parser as ParserBase,
} from '../base';
import type {LintConfiguration} from '../lib/lintConfig';

declare const Parser: ParserBase;
Parser.config = require('../../config/default');
Parser.i18n = require('../../i18n/en');

const re = /\*\*((?:in)?correct)\*\* .+ `(\{[^`]+\})`:((?:\n+```wikitext\n[^`]+\n```)+)$/gmu;

describe('API tests', () => {
	for (const file of fs.readdirSync(path.resolve('wiki'))) {
		if (file.endsWith('.md')) {
			const md = fs.readFileSync(path.resolve('wiki', file), 'utf8'),
				code = /(?<=```js\n\/\/ lint\n).*?(?=\n```)/su.exec(md)?.[0];
			describe(file, () => {
				beforeEach(() => {
					Parser.lintConfig = undefined as unknown as LintConfiguration;
				});
				if (code) {
					const lines = code.split('\n') as [string, ...string[]];
					it('lint', async () => {
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
				const cur = file.slice(0, -3) as LintError.Rule;
				// @ts-expect-error Node.js-only rule
				if (cur !== 'invalid-css' && cur !== 'invalid-math') {
					// eslint-disable-next-line @typescript-eslint/no-shadow
					for (const code of md.matchAll(re)) {
						const [, state, config, wikitext] = code as string[] as [string, string, string, string];
						it(config, () => {
							const rules: LintRuleConfig = JSON.parse(config);
							// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
										Parser.lint(block)
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
				}
			});
		}
	}
});
