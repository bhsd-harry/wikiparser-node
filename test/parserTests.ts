import assert from 'assert/strict';
import Parser from '../index';
import type {Test} from '@bhsd/common/dist/test';

/* NOT FOR BROWSER */

import {prepare} from '../script/util';

prepare(Parser);

/**
 * 合并`wpb-list`元素
 * @param html HTML字符串
 */
const merge = (html: string): string =>
	html.replaceAll('</span><span class="wpb-list">', '');

/* NOT FOR BROWSER END */

/* PRINT ONLY */

/**
 * HTML字符串分行
 * @param str HTML字符串
 */
const split = (str: string): string[] => str
	.replace(/(?:<span class="wpb-list">[^<]+<\/span>)+/gu, merge)
	.split(/(?<=<\/\w+>)(?!$)|(?<!^)(?=<\w)/u);

/* PRINT ONLY END */

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, wikitext, print, render} of tests) {
		if (
			wikitext && (print || render)
		) {
			it(desc, () => {
				const root =
					Parser.parse(wikitext);

				/* NOT FOR BROWSER */

				root.buildLists();

				/* NOT FOR BROWSER END */

				try {
					if (print) {
						assert.deepStrictEqual(split(root.print()), split(print));
					}

					/* NOT FOR BROWSER */

					if (render) {
						assert.deepStrictEqual(split(root.toHtml()), split(render));
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
