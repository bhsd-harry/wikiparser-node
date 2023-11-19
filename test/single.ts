import * as fs from 'fs';
import * as assert from 'assert/strict';
import {diff} from '../util/diff';
import * as Parser from '../index';

const wikitext = fs.readFileSync('./test/single-page.wiki', 'utf8');

(async (): Promise<void> => {
	if (process.execArgv.includes('--prof')) {
		Parser.parse(wikitext);
		return;
	}
	console.time('parse');
	const token = Parser.parse(wikitext);
	console.timeEnd('parse');
	const parsed = String(token);
	if (parsed !== wikitext) {
		await diff(wikitext, parsed);
		throw new Error('解析过程中不可逆地修改了原始文本！');
	}

	console.time('print');
	const printed = token.print();
	console.timeEnd('print');
	const entities = {lt: '<', gt: '>', amp: '&'},
		restored = printed.replace(/<[^<]+?>|&([lg]t|amp);/gu, (_, s?: 'lt' | 'gt' | 'amp') => s ? entities[s] : '');
	if (restored !== wikitext) {
		await diff(wikitext, restored);
		throw new Error('渲染HTML过程中不可逆地修改了原始文本！');
	}

	console.time('lint');
	const errors = token.lint();
	console.timeEnd('lint');
	assert.deepEqual(errors, []);
})();
