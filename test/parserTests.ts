import * as assert from 'assert/strict';
import Parser = require('../index');

declare interface Test {
	desc: string;
	wikitext?: string;
	print?: string;
	render?: string;
}

/* NOT FOR BROWSER */

const redirects: Record<string, string> = {
	'File:Redirect_to_foobar.jpg': 'File:Foobar.jpg',
	'Template:Redirect_to_foo': 'Template:Foo',
	'Template:Templateredirect': 'Template:Templatesimple',
};

Parser.viewOnly = true;
Parser.warning = false;
Parser.templateDir = './test/templates';
Parser.redirects = Object.entries(redirects) as Iterable<[string, string]> as Map<string, string>;

/**
 * 合并`wpb-list`元素
 * @param html HTML字符串
 */
const merge = (html: string): string =>
	html.replaceAll('</span><span class="wpb-list">', '');

/* NOT FOR BROWSER END */

/**
 * HTML字符串分行
 * @param str HTML字符串
 */
const split = (str: string): string[] => str
	.replace(/(?:<span class="wpb-list">[^<]+<\/span>)+/gu, merge)
	.split(/(?<=<\/\w+>)(?!$)|(?<!^)(?=<\w)/u);

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, wikitext, print, render} of tests) {
		if (
			wikitext && (print || /* istanbul ignore next */ render)
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
				} catch (e) /* istanbul ignore next */ {
					if (e instanceof assert.AssertionError) {
						e.cause = {message: `\n${wikitext}`};
					}
					throw e;
				}
			});
		}
	}
});
