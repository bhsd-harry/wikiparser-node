import assert from 'assert';
import Parser from '../index';
import type {Test} from '@bhsd/test-util';

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, wikitext, print, render} of tests) {
		if (wikitext && (print || render)) {
			it(desc, () => {
				const root = Parser.parse(wikitext),
					tidied = wikitext.replaceAll('\0', '');
				try {
					assert.strictEqual(
						root.toString(),
						tidied,
						'解析过程中不可逆地修改了原始文本！',
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
