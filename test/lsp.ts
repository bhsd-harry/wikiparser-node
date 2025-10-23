import {error} from '../util/diff';
import type {
	Position,

	/* NOT FOR BROWSER ONLY */

	Range,
} from 'vscode-languageserver-types';
import type {SimplePage} from '@bhsd/test-util';
import type {
	LanguageService,

	/* NOT FOR BROWSER ONLY */

	TokenTypes,
} from '../base';

/* NOT FOR BROWSER ONLY */

import {execSync} from 'child_process';
import Parser from '../index';
import type {
	Token,
	ImageParameterToken,
	ExtToken,
	HtmlToken,
	AtomToken,
} from '../internal';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

Parser.viewOnly = true;

/* NOT FOR BROWSER END */

declare type Key = keyof LanguageService | 'constructor';

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
 * @param silent 是否静默
 * @throws `Error` 无返回值
 */
const check = (value: unknown, title: string, pos: Position, silent?: boolean): void => {
	if (!value && !silent) {
		throw new Error(`${title} 的第 ${pos.line + 1} 行 ${pos.character} 列未返回结果！`);
	}
};

/**
 * 将索引转换为位置
 * @param root 根节点
 * @param index 索引
 */
const indexToPos = (
	root: Token,
	index: number,
): Position => {
	const {top, left} = root.posFromIndex(index)!;
	return {line: top, character: left};
};

/**
 * 测试单个页面
 * @param page 页面
 * @param page.title 页面标题
 * @param page.content 页面源代码
 * @param summary 是否汇总
 * @param silent 是否静默
 */
export default async ({title, content}: SimplePage, summary?: boolean, silent?: boolean): Promise<void> => {
	content = content.replace(/[\0\x7F]|\r$/gmu, '');

	/* NOT FOR BROWSER ONLY */

	const lsp = Parser.createLanguageService();
	lsp.lilypond = execSync('which lilypond', {encoding: 'utf8'}).trim();
	lsp.config = {...Parser.getConfig(), articlePath: 'https://mediawiki.org/wiki/$1'};
	const rgba = (await import('color-rgba')).default;
	const root = Parser.parse(content, title, true),
		imageParameter = root.querySelector<ImageParameterToken>('image-parameter'),
		attrKey = root.querySelector('attr-key'),
		ext = root.querySelector<ExtToken>('ext'),
		html = root.querySelector<HtmlToken>('html'),
		headingTitle = root.querySelector('heading-title'),
		argName = root.querySelector('arg-name'),
		templateName = root.querySelector('template-name'),
		magicWordName = root.querySelector('magic-word-name'),
		parserFunctionName = root.querySelector<AtomToken>('magic-word-name#invoke' as TokenTypes),
		doubleUnderscore = root.querySelector('double-underscore'),
		table = root.querySelector('table'),

		/* NOT FOR BROWSER */

		parameterKey = root.querySelector('template > parameter[anon!=true] > parameter-key' as TokenTypes),
		linkTarget = root.querySelector('link > link-target' as TokenTypes),
		refName = root.querySelector<AtomToken>('ext-attrs#ref > ext-attr#name' as TokenTypes),

		/* NOT FOR BROWSER END */

		renamePositions = ([
			argName,
			templateName,
			linkTarget,
		].filter(Boolean) as Token[])
			.map(token => indexToPos(root, token.getAbsoluteIndex() + 1));

	/* NOT FOR BROWSER ONLY END */

	if (!silent) {
		console.time(`LSP: ${title}`);
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
			case 'resolveCodeAction':
			case 'provideCodeAction':
			case 'setTargetWikipedia':
				break;
			case 'provideDocumentColors':
				await wrap(method, title, () => lsp.provideDocumentColors(rgba, content), summary);
				break;
			case 'provideCompletionItems': {
				const positions = [

					/* NOT FOR BROWSER ONLY */

					...([
						imageParameter,
						attrKey,
						parameterKey,
					].filter(Boolean) as Token[])
						.map(token => token.getAbsoluteIndex() + /^\s*/u.exec(token.toString())![0].length + 1),

					/* NOT FOR BROWSER ONLY END */

					...[
						/(?<=<)/u, // tag
						/(?<=__)/u, // behavior switch
						/(?<=(?<!\[)\[)/u, // protocol
						/(?<=\{{3})/u, // argument
						/(?<=\[\[)/u, // link
						/(?<=(?<!\{)\{\{)/u, // parser function or template
					// eslint-disable-next-line @stylistic/comma-dangle
					].map(re => content.search(re)).filter(i => i !== -1)
				]
					.map(i => indexToPos(
						root,
						i,
					));
				if (positions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of positions) {
							check(await lsp.provideCompletionItems(content, pos), title, pos, silent);
						}
					}, summary);
				}
				break;
			}
			case 'provideFoldingRanges':
			case 'provideLinks':
			case 'provideDiagnostics':
			case 'provideDocumentSymbols':
				await wrap(method, title, () => lsp[method](content), summary);
				break;

				/* NOT FOR BROWSER ONLY */

			case 'provideReferences': {
				const tokens = [
					// 不需要 +1
					attrKey,
					headingTitle,
					// 需要 +1
					ext,
					html,
					imageParameter?.name !== 'caption' && imageParameter,
					argName,
					templateName,
					magicWordName,
					linkTarget,
					parameterKey,
				];
				const positions = [...tokens.entries()].filter((entry): entry is [number, Token] => Boolean(entry[1]))
					.map(([i, token]) => indexToPos(root, token.getAbsoluteIndex() + Number(i > 1)));
				if (positions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of positions) {
							check(await lsp.provideReferences(content, pos), title, pos, silent);
						}
					}, summary);
				}
				break;
			}
			case 'resolveRenameLocation':
			case 'provideRenameEdits':
				if (renamePositions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of renamePositions) {
							check(await lsp[method](content, pos, 'x'), title, pos, silent);
						}
					}, summary);
				}
				break;
			case 'provideHover': {
				const positions = ([doubleUnderscore, magicWordName].filter(Boolean) as Token[])
					.map(token => indexToPos(root, token.getAbsoluteIndex()));
				if (positions.length > 0) {
					await wrap(method, title, async () => {
						for (const pos of positions) {
							await lsp.provideHover(content, pos);
						}
					}, summary);
				}
				break;
			}
			case 'provideSignatureHelp':
				if (parserFunctionName) {
					const pos = indexToPos(root, parserFunctionName.nextSibling!.getAbsoluteIndex());
					await wrap(method, title, () => lsp.provideSignatureHelp(content, pos), summary);
				}
				break;
			case 'provideRefactoringAction':
				if (table) {
					const {top, left, height, width} = table.getBoundingClientRect(),
						range: Range = {
							start: {line: top, character: left},
							end: {line: top + height - 1, character: (height === 1 ? left : 0) + width},
						};
					await wrap(method, title, () => lsp.provideRefactoringAction(content, range), summary);
				}
				break;

				/* NOT FOR BROWSER ONLY END */

				/* NOT FOR BROWSER */

			case 'provideDefinition':
				if (refName) {
					const pos = indexToPos(root, refName.getAbsoluteIndex());
					await wrap(method, title, () => lsp.provideDefinition(content, pos), summary);
				}
				break;

				/* NOT FOR BROWSER END */

			default:
				throw new Error(`未检测的方法：${method as string}`);
		}
	}
	lsp.destroy();
	if (!silent) {
		console.timeEnd(`LSP: ${title}`);
	}
};
