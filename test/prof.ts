import {
	readFileSync,
} from 'fs';
import single from './single';
import {mock} from './wikiparse';
import type {SimplePage} from '@bhsd/common/dist/test';
import type {Config} from '../base';

const config: Config = require('../../config/default');
wikiparse.setConfig(config);
const linter = new wikiparse.Linter!(true),
	lsp = new wikiparse.LanguageService!();

/**
 * 测试单个指令
 * @param constructor 类名
 * @param page 页面
 * @param page.title 页面标题
 * @param page.content 页面源代码
 * @param fn 测试指令
 */
const wrap = async (
	constructor: string,
	{title, content}: SimplePage,
	fn: (s: string) => Promise<unknown>,
): Promise<void> => {
	console.time(`${constructor}: ${title}`);
	await fn(content);
	console.timeEnd(`${constructor}: ${title}`);
};

const content = readFileSync('test/page.wiki', 'utf8'),
	{argv: [,, count, method = '']} = process;
(async () => {
	for (let i = 0; i < (Number(count) || 10); i++) {
		const page: SimplePage = {content, ns: 0, pageid: 0, title: `Pass ${i}`};
		if (
			method !== 'lsp'
			&& method !== 'linter'
		) {
			await single(page, method);
		}
		if (!method || method === 'linter') {
			await wrap('Linter', page, s => linter.queue(s));
			await linter.queue('');
		}
		if (!method || method === 'lsp') {
			await wrap('LanguageService', page, s => lsp.provideDiagnostics(s));
			await lsp.provideInlayHints('');
		}
		console.log();
	}
	setTimeout(() => {
		void mock.worker.terminate();
	}, 1000);
})();
