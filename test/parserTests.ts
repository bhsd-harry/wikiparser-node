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
for (const [name, target] of Object.entries(redirects)) {
	Parser.redirects.set(name, target);
}

/* NOT FOR BROWSER END */

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, wikitext, print, render} of tests) {
		if (
			wikitext && (print || render)
		) {
			it(desc, () => {
				const root = Parser.parse(wikitext);
				try {
					if (print) {
						assert.equal(root.print(), print);
					}
					if (render) {
						assert.equal(root.toHtml(), render);
					}
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
