import assert from 'assert';
import {describe, it} from '@bhsd/test-util/mocha';
import Parser from '../../bundle/bundle.min.js'; // eslint-disable-line n/no-missing-import
import type {Test as TestBase} from '@bhsd/test-util/parser';

export interface Test extends TestBase {
	title?: string | undefined;
	html?: string;
	render?: string;
	print?: string;
}

Object.assign(Parser, {
	config: require('../../config/default'),
});

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	// @ts-expect-error no `lint` property
	for (const {desc, title = 'Parser test', wikitext, print, render, lint} of tests) {
		if (wikitext && (print || render)) {
			it(desc, () => {
				const root = Parser.parse(wikitext, title),
					tidied = wikitext.replaceAll('\0', '');
				try {
					assert.strictEqual(
						root.toString(),
						tidied,
						'解析过程中不可逆地修改了原始文本！',
					);
					if (print) {
						assert.strictEqual(
							root.querySelectorAll('template').length,
							print.split('<span class="wpb-template">').length - 1,
						);
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
