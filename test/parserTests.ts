import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {describe, it} from '@bhsd/test-util/mocha';
import {tidy} from '../util/string';
import {Shadow} from '../util/debug';
import {parseRedirect} from '../parser/redirect';
import type {Test as TestBase} from '@bhsd/test-util/parser';
import type {Token} from '../internal';

export interface Test extends TestBase {
	title?: string | undefined;
	render?: string;
	plain?: string;
}

/* NOT FOR BROWSER ONLY */

import Parser from '../index';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import {prepare} from '../script/util';

prepare(Parser);

for (const file of fs.readdirSync('test/templates', {withFileTypes: true, recursive: true})) {
	if (!file.isFile()) {
		continue;
	}
	const {parentPath, name} = file,
		content = tidy(fs.readFileSync(path.join(parentPath, name), 'utf8')),
		accum: Token[] = [],
		parsed = Shadow.run(() => parseRedirect(content, Parser.getConfig(), accum));
	let title = path.relative(
		'./test/templates',
		path.join(parentPath, name.replace(/\.(?:wiki|txt)$/iu, '')),
	).replaceAll('꞉', ':');
	try {
		title = decodeURIComponent(title);
	} catch {}
	if (parsed) {
		Parser.redirects.set(title, parsed);
	} else {
		Parser.templates.set(title, content);
	}
}

/* NOT FOR BROWSER END */

/* PRINT ONLY */

/**
 * HTML字符串分行
 * @param str HTML字符串
 */
const split = (str: string): string[] => str
	.replace(/(?<!\n)\n+/u, '')
	.split(/(?<=<\/\w+>)(?!$)|(?<!^)(?=<\w)/u);

/* PRINT ONLY END */

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, title = 'Parser test', wikitext, render} of tests) {
		if (
			wikitext && render
			&& !wikitext.includes('#rel2abs:')
			&& !wikitext.includes('</charinsert>')
			&& !render.includes('</math>')
			&& !render.includes('mw-highlight mw-highlight-lang-')
			&& !render.includes('<section class="mw-templatedata-doc-wrap">')
		) {
			it(desc, () => {
				/* NOT FOR BROWSER */

				Parser.viewOnly = false;

				assert.strictEqual(
					tests.filter(({desc: d}) => d === desc).length,
					1,
					`测试用例描述重复：${desc}`,
				);

				/* NOT FOR BROWSER END */

				const root = Parser.parse(wikitext, title),
					tidied = wikitext.replaceAll('\0', '');
				try {
					assert.strictEqual(
						root.toString(),
						tidied,
						'解析过程中不可逆地修改了原始文本！',
					);

					/* NOT FOR BROWSER */

					if (render) {
						assert.deepStrictEqual(
							split(
								root.toHtml().replace(
									/\n<div id="catlinks" class="catlinks">.+$/su,
									'',
								),
							),
							split(render),
							'渲染结果不符合预期！',
						);
						assert.deepStrictEqual(
							split(root.toHtml({cats: false})),
							split(render),
							'{cats: false} 选项渲染结果不符合预期！',
						);
						assert.deepStrictEqual(
							split(root.toHtml({redirect: false, cats: false})),
							split(
								render.replace(/<ul class="redirectText">.+?<\/ul>/su, ''),
							),
							'{redirect: false} 选项渲染结果不符合预期！',
						);
						assert.deepStrictEqual(
							split(
								root.toHtml({indicators: true, cats: false}).replace(
									/^(?:<div id="mw-indicator-.+?<\/div>\n)+/su,
									'',
								),
							),
							split(render),
							'{indicators: true} 选项渲染结果不符合预期！',
						);
						if (!/\S__TOC__/u.test(wikitext)) {
							assert.deepStrictEqual(
								split(root.toHtml({toc: false, cats: false})),
								split(
									render.replace(/<div class="toctitle">.+?<\/div>/su, '')
										.replace(/<div id="toc" .+?<\/div>\n?/su, ''),
								),
								'{toc: false} 选项渲染结果不符合预期！',
							);
						}
					}

					/* NOT FOR BROWSER END */
				} catch (e) {
					if (e instanceof assert.AssertionError) {
						e.cause = {message: `\n${wikitext}`};
					}
					throw e;
				}
			});
		}
	}
});
