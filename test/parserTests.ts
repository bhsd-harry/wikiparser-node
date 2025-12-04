import assert from 'assert';
import type {
	Test,
} from '@bhsd/test-util';
import Parser from '../../bundle/bundle.min.js'; // eslint-disable-line n/no-missing-import

Parser.config = require('../../config/default');

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, title = 'Parser test', wikitext, print, render} of tests) {
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
