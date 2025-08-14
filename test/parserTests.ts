import assert from 'assert';
import Parser from '../../bundle/bundle.min.js'; // eslint-disable-line n/no-missing-import
import type {Test} from '@bhsd/test-util';

Parser.config = require('../../config/default');

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, wikitext, print} of tests) {
		if (wikitext && print) {
			it(desc, () => {
				const root = Parser.parse(wikitext);
				try {
					assert.deepStrictEqual(
						root.toString(),
						wikitext.replaceAll('\0', ''),
						'解析过程中不可逆地修改了原始文本！',
					);
					assert.strictEqual(
						root.querySelectorAll('template').length,
						print.split('<span class="wpb-template">').length - 1,
					);
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
