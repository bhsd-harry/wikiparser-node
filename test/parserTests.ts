import assert from 'assert';
import Parser from '../index';
import lsp from './lsp';
import type {
	Test,

	/* NOT FOR BROWSER ONLY */

	SimplePage,
} from '@bhsd/test-util';

const tests: Test[] = require('../../test/parserTests.json');
describe('Parser tests', () => {
	for (const {desc, title, wikitext, print, render} of tests) {
		if (wikitext && (print || render)) {
			it(desc, () => {
				const root = Parser.parse(wikitext, title!),
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

			/* NOT FOR BROWSER ONLY */

			if (process.env['LSP'] !== '0') {
				it(`LSP: ${desc}`, async () => {
					await lsp({title: title!, content: wikitext} as SimplePage, true, true);
				});
			}
		}
	}
});
