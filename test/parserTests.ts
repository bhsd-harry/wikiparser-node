import assert from 'assert';
import {describe, it} from '@bhsd/test-util/mocha';
import type {Test as TestBase} from '@bhsd/test-util/parser';
import type {
	LintError,

	/* NOT FOR BROWSER ONLY */

	LintRuleConfig,
} from '../base';

export interface Test extends TestBase {
	title?: string | undefined;
	html?: string;
	render?: string;
	plain?: string;
	print?: string;
	lint?: LintError[];
}

/* NOT FOR BROWSER ONLY */

import Parser from '../index';
import lsp from './lsp';
import type {SimplePage} from '@bhsd/test-util';

Object.assign(Parser, {
	lintConfig: {
		fix: false,
		rules: {
			'invalid-css': 0,
			'invalid-math': 0,
		} satisfies LintRuleConfig,
	},
});

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';
import {prepare} from '../script/util';

prepare(Parser);
const {window} = new JSDOM(''),
	DOMPurify = createDOMPurify(window),
	mathTags = new Set(['MOVER', 'MUNDER', 'MI', 'MROW']);

/** @ignore */
const normalize = (str: string): string => str.trim().replaceAll(/\s+/gu, '\n');

/**
 * 移除HTML字符串中指定选择器的元素
 * @param render HTML字符串
 * @param selector CSS选择器
 */
const removeFromDom = (render: string, selector: string): HTMLElement => {
	const {body} = new JSDOM(render).window.document;
	for (const ele of body.querySelectorAll(selector)) {
		ele.remove();
	}
	return body;
};

/**
 * 检查HTML字符串是否安全
 * @param render HTML字符串
 * @param plain 纯文本字符串
 */
const purify = (render: string, plain?: string): void => {
	DOMPurify.sanitize(render, {
		FORBID_TAGS: ['style'],
		ADD_TAGS: ['semantics', 'annotation', 'rb', 'rt', 'rtc'],
		ADD_ATTR: ['resource', 'itemscope', 'itemprop', 'content'],
		ADD_URI_SAFE_ATTR: ['resource'],
		ALLOWED_URI_REGEXP:
			/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|news|irc):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/iu,
	});
	assert.deepStrictEqual(
		DOMPurify.removed.map(item => {
			if ('element' in item) {
				const ele = item.element as Element,
					{tagName, outerHTML} = ele,
					attrs = ele.getAttributeNames();
				return !(
					mathTags.has(tagName)
					|| tagName === 'META' && attrs.every(attr => ['itemprop', 'content'].includes(attr))
					|| tagName === 'LINK' && attrs.every(attr => ['itemprop', 'href'].includes(attr))
				) && outerHTML;
			}
			const {attribute} = item;
			if (!attribute) {
				return item;
			}
			const {name, value} = attribute;
			return !(
				name === 'title'
				|| name === 'alt'
				|| name.startsWith('xmlns:')
				|| name === 'typeof' && /^mw:File(?:\/\w+)?$/u.test(value)
				|| name === 'property' && !/^(?:(?:java|vb)script|data):|[<>]/iu.test(value)
				|| !value && name.startsWith('data-')
			) && {[name]: value};
		}).filter(Boolean),
		[],
		'渲染结果不安全！',
	);

	if (plain) {
		const selector = 'div#toc, ul.redirectText,' // 目录和重定向
			+ 'sup.reference, span.mw-ext-cite-error, ol.references, a[href^="#cite_note-"],' // 引用
			+ 'span.mwe-math-element, a.mw-charinsert-item'; // 其他扩展
		assert.strictEqual(
			normalize(removeFromDom(render, selector).textContent),
			normalize(plain),
			'渲染结果与纯文本不一致！',
		);
	}
};

/* NOT FOR BROWSER END */

/* PRINT ONLY */

Parser.internal = true;

const entities = {lt: '<', gt: '>', amp: '&'};

/**
 * 移除HTML标签
 * @param str HTML字符串
 */
const deprint = (str: string): string => str.replaceAll(
	/<[^<]+?>|&([lg]t|amp);/gu,
	(_, s?: keyof typeof entities) => s ? entities[s] : '',
);

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
	for (const {desc, title = 'Parser test', wikitext, print, render, plain, lint} of tests) {
		if (wikitext && (print || render || plain)) {
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

					if (lint) {
						assert.deepStrictEqual(root.lint(), lint);
					}

					/* PRINT ONLY */

					if (print) {
						const printed = root.print();
						assert.strictEqual(
							deprint(printed),
							tidied,
							'高亮过程中不可逆地修改了原始文本！',
						);
						assert.deepStrictEqual(split(printed), split(print));
					}

					/* PRINT ONLY END */

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
						purify(render, plain);
					}

					if (plain) {
						assert.deepStrictEqual(root.plainText(), plain, '纯文本结果不符合预期！');
					}

					/* NOT FOR BROWSER END */
				} catch (e) {
					if (e instanceof assert.AssertionError) {
						e.cause = {message: `\n${wikitext}`};
					}
					throw e;
				}
			});

			/* NOT FOR BROWSER ONLY */

			if (process.env['LSP'] !== '0') {
				it(`LSP: ${desc}`, async () => {
					/* NOT FOR BROWSER */

					Parser.viewOnly = true;

					/* NOT FOR BROWSER END */

					await lsp({title, content: wikitext} as SimplePage, true, true);
				});
			}
		}
	}
});
