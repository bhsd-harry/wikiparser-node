import assert from 'assert';
import type {
	Test,

	/* NOT FOR BROWSER ONLY */

	SimplePage,
} from '@bhsd/test-util';

/* NOT FOR BROWSER ONLY */

import Parser from '../index';
import lsp from './lsp';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';
import {prepare} from '../script/util';

prepare(Parser);
const {window} = new JSDOM(''),
	DOMPurify = createDOMPurify(window),
	mathTags = new Set(['MOVER', 'MUNDER', 'MI', 'MROW']);

/**
 * 检查HTML字符串是否安全
 * @param render HTML字符串
 */
const purify = (render: string): void => {
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
				|| name.startsWith('data-') && !value
			) && {[name]: value};
		}).filter(Boolean),
		[],
	);
};

/**
 * 合并`wpb-list`元素
 * @param html HTML字符串
 */
const merge = (html: string): string =>
	html.replaceAll('</span><span class="wpb-list">', '');

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
	.replaceAll(/(?:<span class="wpb-list">[^<]+<\/span>)+/gu, merge)
	.split(/(?<=<\/\w+>)(?!$)|(?<!^)(?=<\w)/u);

/* PRINT ONLY END */

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, title = 'Parser test', wikitext, print, render} of tests) {
		if (wikitext && (print || render)) {
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

				/* NOT FOR BROWSER */

				root.buildLists();

				/* NOT FOR BROWSER END */

				try {
					assert.strictEqual(
						root.toString(),
						tidied,
						'解析过程中不可逆地修改了原始文本！',
					);

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
						);
						purify(render);
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
