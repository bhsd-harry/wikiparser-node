import {error} from '../util/diff';
import './wikiparse';
import type {Position} from 'vscode-languageserver-types';
import type {SimplePage} from '@bhsd/test-util';
import type {
	LanguageService,
	Config,
} from '../base';

declare type Key = keyof LanguageService | 'constructor';

const config: Config = require('../../config/default');
wikiparse.setConfig({...config, articlePath: 'https://mediawiki.org/wiki/$1'});

/**
 * 测试单个指令
 * @param method 方法名
 * @param title 页面名
 * @param fn 测试指令
 * @param summary 是否汇总
 */
const wrap = async (method: string, title: string, fn: () => Promise<unknown>, summary?: boolean): Promise<void> => {
	try {
		if (!summary) {
			console.time(`${method}: ${title}`);
		}
		await fn();
		if (!summary) {
			console.timeEnd(`${method}: ${title}`);
		}
	} catch (e) {
		error(`执行 ${method} 时出错！`);
		throw e;
	}
};

/**
 * 检查返回值
 * @param value 返回值
 * @param title 页面名
 * @param pos 位置
 * @throws `Error` 无返回值
 */
const check = (value: unknown, title: string, pos: Position): void => {
	if (!value) {
		throw new Error(`${title} 的第 ${pos.line + 1} 行 ${pos.character} 列未返回结果！`);
	}
};

/**
 * 将索引转换为位置
 * @param content 源代码
 * @param index 索引
 */
const indexToPos = (
	content: string,
	index: number,
): Position => {
	const lines = content.slice(0, index).split('\n');
	return {line: lines.length - 1, character: lines.at(-1)!.length};
};

/**
 * 测试单个页面
 * @param page 页面
 * @param page.title 页面标题
 * @param page.content 页面源代码
 * @param summary 是否汇总
 */
export default async ({title, content}: SimplePage, summary?: boolean): Promise<void> => {
	content = content.replace(/[\0\x7F]|\r$/gmu, '');
	const lsp = new wikiparse.LanguageService!();

	if (summary) {
		console.time('LSP');
	}
	await wrap('provideInlayHints', title, () => {
		void lsp.provideInlayHints(
			`${content} `,
			// content,
		);
		return new Promise(resolve => {
			resolve(lsp.provideInlayHints(content));
		});
	}, summary);

	for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(lsp)) as Key[]) {
		switch (method) {
			case 'constructor':
			case 'data':
			case 'destroy':
			case 'findStyleTokens':
			case 'provideInlayHints':
			case 'provideColorPresentations':
			case 'provideDefinition':
			case 'provideReferences':
			case 'resolveRenameLocation':
			case 'provideRenameEdits':
			case 'provideHover':
			case 'provideSignatureHelp':
			case 'include':
				break;
			case 'provideDocumentColors':
				await wrap(method, title, () => lsp.provideDocumentColors(content), summary);
				break;
			case 'provideCompletionItems': {
				const positions = [
					/(?<=<)/u, // tag
					/(?<=__)/u, // behavior switch
					/(?<=(?<!\[)\[)/u, // protocol
					/(?<=\{{3})/u, // argument
					/(?<=\[\[)/u, // link
					/(?<=(?<!\{)\{\{)/u, // parser function or template
				].map(re => content.search(re)).filter(i => i !== -1)
					.map(i => indexToPos(
						content,
						i,
					));
				if (positions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of positions) {
							check(await lsp.provideCompletionItems(content, pos), title, pos);
						}
					}, summary);
				}
				break;
			}
			case 'provideFoldingRanges':
			case 'provideLinks':
			case 'provideDiagnostics':
				await wrap(method, title, () => lsp[method](content), summary);
				break;
			default:
				throw new Error(`未检测的方法：${method as string}`);
		}
	}
	lsp.destroy();
	if (summary) {
		console.timeEnd('LSP');
	}
};
