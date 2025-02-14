import {error} from '../util/diff';
import type {Position} from 'vscode-languageserver-types';
import type {Parser, LanguageService, TokenTypes} from '../base';
import type {
	Token,
	ImageParameterToken,
	ExtToken,
	HtmlToken,
	AtomToken,
} from '../internal';

declare type Key = keyof LanguageService | 'constructor';

/**
 * 测试单个指令
 * @param method 方法名
 * @param title 页面名
 * @param fn 测试指令
 */
const wrap = async (method: string, title: string, fn: () => Promise<unknown>): Promise<void> => {
	try {
		console.time(`${method}: ${title}`);
		await fn();
		console.timeEnd(`${method}: ${title}`);
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
	if (!value || Array.isArray(value) && value.length === 0) {
		throw new Error(`${title} 的第 ${pos.line + 1} 行 ${pos.character} 列未返回结果！`);
	}
};

/**
 * 将索引转换为位置
 * @param text 文本
 * @param index 索引
 */
const indexToPos = (text: string, index: number): Position => {
	const lines = text.slice(0, index).split('\n');
	return {line: lines.length - 1, character: lines.pop()!.length};
};

/**
 * 测试单个页面
 * @param Parser 解析器
 * @param page 页面
 * @param page.title 页面标题
 * @param page.content 页面源代码
 */
export default async (Parser: Parser, {title, content}: SimplePage): Promise<void> => {
	content = content.replace(/[\0\x7F]|\r$/gmu, '');
	// eslint-disable-next-line no-eval
	const {default: rgba}: {default: typeof import('color-rgba')} = await eval('import("color-rgba")');
	const lsp = Parser.createLanguageService({}),
		root = Parser.parse(content, true),
		imageParameter = root.querySelector<ImageParameterToken>('image-parameter'),
		attrKey = root.querySelector('attr-key'),
		namedParameterKey = root.querySelector('parameter[anon!=true] > parameter-key' as TokenTypes),
		ext = root.querySelector<ExtToken>('ext'),
		html = root.querySelector<HtmlToken>('html'),
		headingTitle = root.querySelector('heading-title'),
		argName = root.querySelector('arg-name'),
		templateName = root.querySelector('template-name'),
		magicWordName = root.querySelector('magic-word-name'),
		parserFunctionName = root.querySelector<AtomToken>('magic-word-name#invoke' as TokenTypes),
		linkTarget = root.querySelector('link > link-target' as TokenTypes),
		refName = root.querySelector<AtomToken>('ext-attrs#ref > ext-attr#name > attr-value' as TokenTypes),
		doubleUnderscore = root.querySelector('double-underscore'),
		renamePositions = ([argName, templateName, magicWordName, linkTarget].filter(Boolean) as Token[])
			.map(token => indexToPos(content, token.getAbsoluteIndex() + 1));
	await lsp.provideDiagnostics(content, false);

	for (const method of Object.getOwnPropertyNames(lsp.constructor.prototype) as Key[]) {
		switch (method) {
			case 'constructor':
			case 'data':
			case 'destroy':
			case 'provideColorPresentations':
			case 'provideCodeAction':
				break;
			case 'provideDocumentColors':
				await wrap(method, title, () => lsp.provideDocumentColors(rgba, content));
				break;
			case 'provideCompletionItems': {
				const positions = [
					...[
						/(?<=<)/u, // tag
						/(?<=__)/u, // behavior switch
						/(?<=(?<!\[)\[)/u, // protocol
						/(?<=\{{3})/u, // argument
						/(?<=\[\[)/u, // link
						/(?<=(?<!\{)\{\{)/u, // parser function or template
					].map(re => content.search(re)).filter(i => i !== -1),
					...([imageParameter, attrKey, namedParameterKey].filter(Boolean) as Token[])
						.map(token => token.getAbsoluteIndex() + /^\s*/u.exec(token.toString())![0].length + 1),
				].map(i => indexToPos(content, i));
				if (positions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of positions) {
							check(await lsp.provideCompletionItems(content, pos), title, pos);
						}
					});
				}
				break;
			}
			case 'provideDiagnostics':
			case 'provideFoldingRanges':
			case 'provideLinks':
			case 'provideInlayHints':
			case 'provideDocumentSymbols':
				await wrap(method, title, () => lsp.provideDiagnostics(content));
				break;
			case 'provideReferences': {
				const tokens = [
					// 不需要 +1
					attrKey,
					headingTitle,
					// 需要 +1
					ext,
					html,
					imageParameter,
					argName,
					templateName,
					magicWordName,
					linkTarget,
					namedParameterKey,
				];
				const positions = [...tokens.entries()].filter((entry): entry is [number, Token] => Boolean(entry[1]))
					.map(([i, token]) => indexToPos(content, token.getAbsoluteIndex() + Number(i > 1)));
				if (positions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of positions) {
							check(await lsp.provideReferences(content, pos), title, pos);
						}
					});
				}
				break;
			}
			case 'provideDefinition':
				if (refName) {
					const pos = indexToPos(content, refName.getAbsoluteIndex());
					await wrap(method, title, () => lsp.provideDefinition(content, pos));
				}
				break;
			case 'resolveRenameLocation':
			case 'provideRenameEdits':
				if (renamePositions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of renamePositions) {
							check(await lsp[method](content, pos, 'x'), title, pos);
						}
					});
				}
				break;
			case 'provideHover': {
				const positions = ([doubleUnderscore, magicWordName].filter(Boolean) as Token[])
					.map(token => indexToPos(content, token.getAbsoluteIndex()));
				if (positions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of positions) {
							check(await lsp.provideHover(content, pos), title, pos);
						}
					});
				}
				break;
			}
			case 'provideSignatureHelp':
				if (parserFunctionName) {
					const pos = indexToPos(content, parserFunctionName.nextSibling!.getAbsoluteIndex());
					await wrap(method, title, () => lsp.provideSignatureHelp(content, pos));
				}
				break;
			default:
				throw new Error(`未检测的方法：${method as string}`);
		}
	}
};
