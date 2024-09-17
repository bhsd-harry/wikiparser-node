import * as assert from 'assert/strict';
import {diff} from '../util/diff';
import Parser = require('../index');

declare interface Test {
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
(async () => {
	let failed = 0;
	for (const [i, {wikitext, print, render}] of tests.entries()) {
		if (wikitext && (print || render)) {
			const root = Parser.parse(wikitext);
			try {
				if (print) {
					assert.equal(root.print(), print);
				}
				if (render) {
					assert.equal(root.toHtml(), render);
				}
			} catch (e) {
				console.log(wikitext);
				console.log();
				if (e instanceof assert.AssertionError) {
					await diff(e.expected as string, e.actual as string, i);
				}
				failed++;
			}
		}
	}
	if (failed) {
		throw new Error(`${failed} tests failed!`);
	}
})();
