import {splitColors, numToHex} from '@bhsd/common';
import {typeError} from '../util/debug';
import {htmlAttrs, extAttrs, commonHtmlAttrs} from '../util/sharable';
import {getEndPos} from '../util/lint';
import Parser from '../index';
import {AstElement} from '../lib/element';
import type {
	Position,
	ColorInformation,
	ColorPresentationParams,
	ColorPresentation,
	CompletionItem,
	CompletionItemKind,
	FoldingRange,
	DocumentSymbol,
	DocumentLink,
} from 'vscode-languageserver/node';
import type {TokenTypes} from '../base';
import type {AstNodes, Token, AstText, AttributeToken, ParameterToken, HeadingToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

declare type PartialCompletionItem = Omit<CompletionItem, 'kind'> & {kind: keyof typeof CompletionItemKind};

declare interface CompletionConfig {
	re: RegExp;
	ext: string[];
	tags: Set<string>;
	allTags: string[];
	functions: string[];
	switches: string[];
	protocols: string[];
	params: string[];
}

const tasks = new WeakMap<object, LanguageService>(),
	plainTypes = new Set<TokenTypes | 'text'>(['text', 'comment', 'noinclude', 'include']);

/**
 * Check if all child nodes are plain text or comments.
 * @param childNodes child nodes
 */
const isPlain = (childNodes: readonly AstNodes[]): boolean => childNodes.every(({type}) => plainTypes.has(type));

/**
 * Get the position of a character in the document.
 * @param root root token
 * @param i character index
 */
const positionAt = (root: Token, i: number): Position => {
	const {top, left} = root.posFromIndex(i)!;
	return {line: top, character: left};
};

/**
 * Get completion items.
 * @param words words to choose from
 * @param kind completion item kind
 * @param mt matched text
 * @param pos position
 * @param pos.line line number
 * @param pos.character character number
 */
const getCompletion = (
	words: Iterable<string>,
	kind: keyof typeof CompletionItemKind,
	mt: string,
	{line, character}: Position,
): PartialCompletionItem[] => [...new Set(words)].map(w => ({
	label: w,
	kind,
	textEdit: {
		range: {
			start: {line, character: character - mt.length},
			end: {line, character},
		},
		newText: w,
	},
}));

/**
 * Get the end position of a section.
 * @param section section
 * @param lines lines
 * @param line line number
 */
const getSectionEnd = (section: DocumentSymbol | undefined, lines: string[], line: number): void => {
	if (section) {
		section.range.end = {line, character: lines[line]!.length};
	}
};

/**
 * Create the URL of a page.
 * @param page page name
 * @param ns namespace
 * @throws `RangeError` Invalid page name.
 * @throws `Error` Article path is not set.
 */
const getUrl = (page: string, ns?: number): string => {
	const {title, fragment, valid} = Parser.normalizeTitle(page, ns),
		{articlePath} = Parser.getConfig();
	/* istanbul ignore next */
	if (!valid) {
		throw new RangeError('Invalid page name.');
	} else if (!articlePath) {
		throw new Error('Article path is not set.');
	}
	const encoded = encodeURIComponent(title) + (fragment === undefined ? '' : `#${encodeURIComponent(fragment)}`);
	return articlePath.includes('$1')
		? articlePath.replace('$1', encoded)
		: articlePath + (articlePath.endsWith('/') ? '' : '/') + encoded;
};

/** VSCode-style language service */
export class LanguageService {
	/* istanbul ignore next */
	/**
	 * 获取指定任务
	 * @param uri 任务标识
	 */
	static get(uri: object): LanguageService | undefined {
		return tasks.get(uri);
	}

	#text: string;
	#running: Promise<Token> | undefined;
	#done: Token | undefined;
	#completionConfig: CompletionConfig | undefined;

	/** @param uri 任务标识 */
	constructor(uri: object) {
		tasks.set(uri, this);
	}

	/**
	 * 提交解析任务
	 * @param text 源代码
	 * @description
	 * - 总是更新`text`以便`parse`完成时可以判断是否需要重新解析
	 * - 如果已有进行中或已完成的解析，则返回该解析的结果
	 * - 否则开始新的解析
	 */
	async #queue(text: string): Promise<Token> {
		/* istanbul ignore if */
		if (typeof text !== 'string') {
			return typeError(this.constructor, 'queue', 'String');
		} else if (this.#text === text && !this.#running && this.#done) {
			return this.#done;
		}
		this.#text = text;
		this.#running ??= this.#parse(); // 不要提交多个解析任务
		return this.#running;
	}

	/**
	 * 执行解析
	 * @description
	 * - 完成后会检查`text`是否已更新，如果是则重新解析
	 * - 总是返回最新的解析结果
	 */
	async #parse(): Promise<Token> {
		return new Promise(resolve => {
			(typeof setImmediate === 'function' ? setImmediate : /* istanbul ignore next */ setTimeout)(() => {
				const text = this.#text,
					root = Parser.parse(text, true);
				if (this.#text === text) {
					this.#done = root;
					this.#running = undefined;
					resolve(root);
					return;
				}
				/* istanbul ignore next */
				this.#running = this.#parse();
				/* istanbul ignore next */
				resolve(this.#running);
			}, 0);
		});
	}

	/**
	 * 提供颜色指示
	 * @param rgba 颜色解析函数
	 * @param text 源代码
	 */
	async provideDocumentColors(
		rgba: (s: string) => [number, number, number, number] | [],
		text: string,
	): Promise<ColorInformation[]> {
		const root = await this.#queue(text);
		return root.querySelectorAll('attr-value,parameter-value,arg-default').flatMap(({type, childNodes}) => {
			if (type !== 'attr-value' && !isPlain(childNodes)) {
				return [];
			}
			return childNodes.filter((child): child is AstText => child.type === 'text').flatMap(child => {
				const parts = splitColors(child.data).filter(([,,, isColor]) => isColor);
				if (parts.length === 0) {
					return [];
				}
				const start = child.getAbsoluteIndex();
				return parts.map(([s, from, to]): ColorInformation | false => {
					const color = rgba(s);
					return color.length === 4 && {
						color: {
							red: color[0] / 255,
							green: color[1] / 255,
							blue: color[2] / 255,
							alpha: color[3],
						},
						range: {
							start: positionAt(root, start + from),
							end: positionAt(root, start + to),
						},
					};
				}).filter(Boolean) as ColorInformation[];
			});
		});
	}

	/**
	 * 颜色选择器
	 * @ignore
	 */
	provideColorPresentations( // eslint-disable-line @typescript-eslint/class-methods-use-this
		{color: {red, green, blue, alpha}, range}: ColorPresentationParams,
	): ColorPresentation[] {
		const newText = `#${numToHex(red)}${numToHex(green)}${numToHex(blue)}${alpha < 1 ? numToHex(alpha) : ''}`;
		return [
			{
				label: newText,
				textEdit: {range, newText},
			},
		];
	}

	/** 准备自动补全设置 */
	#prepareCompletionConfig(): CompletionConfig {
		if (!this.#completionConfig) {
			const {
					nsid,
					ext,
					html,
					parserFunction: [insensitive, sensitive, ...other],
					doubleUnderscore,
					protocol,
					img,
				} = Parser.getConfig(),
				tags = new Set([ext, html].flat(2));
			this.#completionConfig = {
				re: new RegExp(
					'(?:' // eslint-disable-line prefer-template
					+ String.raw`<\/?(\w+)` // tag
					+ '|'
					+ String.raw`(\{{2,4}|\[\[)\s*([^|{}<>[\]\s][^|{}<>[\]#]*)` // braces and brackets
					+ '|'
					+ String.raw`(__(?:(?!__)[\p{L}\d_])+)` // behavior switch
					+ '|'
					+ String.raw`(?<!\[)\[([a-z:/]+)` // protocol
					+ '|'
					+ String.raw`\[\[\s*(?:${
						Object.entries(nsid).filter(([, v]) => v === 6).map(([k]) => k).join('|')
					})\s*:[^[\]{}<>]+\|([^[\]{}<>|=]+)` // image parameter
					+ '|'
					// attribute key
					+ String.raw`<(\w+)(?:\s(?:[^<>{}|=\s]+(?:\s*=\s*(?:[^\s"']\S*|(["']).*?\8))?(?=\s))*)?\s(\w+)`
					+ ')$',
					'iu',
				),
				ext,
				tags,
				allTags: [...tags, 'onlyinclude', 'includeonly', 'noinclude'],
				functions: [
					Object.keys(insensitive),
					Array.isArray(sensitive) ? /* istanbul ignore next */ sensitive : Object.keys(sensitive),
					other,
				].flat(2),
				switches: (doubleUnderscore.slice(0, 2) as string[][]).flat().map(w => `__${w}__`),
				protocols: protocol.split('|'),
				params: Object.keys(img).filter(k => k.endsWith('$1') || !k.includes('$1'))
					.map(k => k.replace(/\$1$/u, '')),
			};
		}
		return this.#completionConfig;
	}

	/**
	 * 提供自动补全
	 * @param text 源代码
	 * @param position 位置
	 */
	async provideCompletionItems(text: string, position: Position): Promise<PartialCompletionItem[] | null> {
		const {re, allTags, functions, switches, protocols, params, tags, ext} = this.#prepareCompletionConfig(),
			{line, character} = position,
			mt = re.exec(text.split(/\r?\n/u)[line]?.slice(0, character) ?? '');
		if (mt?.[1]) { // tag
			return getCompletion(allTags, 'Class', mt[1], position);
		} else if (mt?.[4]) { // behavior switch
			return getCompletion(switches, 'Constant', mt[4], position);
		} else if (mt?.[5]) { // protocol
			return getCompletion(protocols, 'Reference', mt[5], position);
		}
		const root = await this.#queue(text);
		if (mt?.[2] === '{{{') { // argument
			return getCompletion(
				root.querySelectorAll('arg').map(({name}) => name!),
				'Variable',
				mt[3]!,
				position,
			);
		} else if (mt?.[3]) { // parser function, template or link
			const colon = mt[3].startsWith(':'),
				str = colon ? mt[3].slice(1).trimStart() : mt[3];
			if (mt[2] === '[[') {
				return getCompletion(
					root.querySelectorAll('link,file,category').map(({name}) => name!),
					'Folder',
					str,
					position,
				);
			}
			return [
				...getCompletion(functions, 'Function', mt[3], position),
				...mt[3].startsWith('#')
					? []
					: getCompletion(
						root.querySelectorAll('template')
							.map(({name}) => colon ? name! : name!.replace(/^Template:/u, '')),
						'Folder',
						str,
						position,
					),
			];
		}
		let token: Token | undefined;
		if ('elementFromPoint' in root) {
			const node = root.elementFromPoint(character, line)!;
			token = node.type === 'text' ? node.parentNode : node;
		}
		/* istanbul ignore if */
		if (!token) { // workaround
			let offset = root.indexFromPos(line, character)!,
				node = root;
			while (true) { // eslint-disable-line no-constant-condition
				// eslint-disable-next-line @typescript-eslint/no-loop-func
				const child = node.childNodes.find(ch => {
					const i = ch.getRelativeIndex();
					if (i < offset && i + ch.toString().length >= offset) {
						offset -= i;
						return true;
					}
					return false;
				});
				if (!child || child.type === 'text') {
					break;
				}
				node = child;
			}
			token = node;
		}
		const {type, parentNode} = token;
		if (mt?.[6]?.trim() || type === 'image-parameter') { // image parameter
			const match = mt?.[6]?.trimStart()
				?? root.toString().slice(
					token.getAbsoluteIndex(),
					root.indexFromPos(position.line, position.character),
				).trimStart();
			return [
				...getCompletion(params, 'Property', match, position),
				...getCompletion(
					root.querySelectorAll('image-parameter#width').map(width => width.text()),
					'Unit',
					match,
					position,
				),
			];
		} else if (mt?.[7] || type === 'attr-key') { // attribute key
			const tag = mt?.[7]?.toLowerCase() ?? (parentNode as AttributeToken).tag;
			if (!tags.has(tag)) {
				return null;
			}
			const key = mt?.[9] ?? token.toString(),
				thisHtmlAttrs = htmlAttrs[tag],
				thisExtAttrs = extAttrs[tag],
				extCompletion = thisExtAttrs
					? getCompletion(thisExtAttrs, 'Field', key, position)
					: null;
			return ext.includes(tag) && !thisHtmlAttrs
				? extCompletion
				: [
					...extCompletion ?? [],
					...tag === 'meta' || tag === 'link'
						? []
						: getCompletion(commonHtmlAttrs, 'Property', key, position),
					...thisHtmlAttrs
						? getCompletion(thisHtmlAttrs, 'Property', key, position)
						: [],
					...getCompletion(['data-'], 'Variable', key, position),
					...getCompletion(['xmlns:'], 'Interface', key, position),
				];
		} else if (
			(type === 'parameter-key' || type === 'parameter-value' && (parentNode as ParameterToken).anon)
			&& parentNode!.parentNode!.type === 'template'
		) { // parameter key
			return getCompletion(
				root.querySelectorAll<ParameterToken>('parameter').filter(
					({anon, parentNode: parent}) => !anon && parent!.type === 'template'
						&& parent!.name === parentNode!.parentNode!.name,
				).map(({name}) => name),
				'Variable',
				token.toString().trimStart(),
				position,
			);
		}
		return null;
	}

	/**
	 * 提供折叠范围或章节
	 * @param text 源代码
	 * @param symbol 是否提供章节
	 */
	async #provideFoldingRangesOrDocumentSymbols(text: string): Promise<FoldingRange[]>;
	async #provideFoldingRangesOrDocumentSymbols(text: string, symbol: true): Promise<DocumentSymbol[]>;
	async #provideFoldingRangesOrDocumentSymbols(
		text: string,
		symbol?: true,
	): Promise<FoldingRange[] | DocumentSymbol[]> {
		const ranges: FoldingRange[] = [],
			symbols: DocumentSymbol[] = [],
			names = new Set<string>(),
			lines = text.split(/\r?\n/u),
			{length} = lines,
			root = await this.#queue(text),
			levels = new Array<number | undefined>(6),
			sections = new Array<DocumentSymbol | undefined>(6),
			tokens = root.querySelectorAll<Token>(symbol ? 'heading-title' : 'heading-title,table,template,magic-word');
		for (const token of tokens) {
			const {top, left, height, width} = token.getBoundingClientRect();
			if (token.type === 'heading-title') {
				const {level} = token.parentNode as HeadingToken;
				if (symbol) {
					for (let i = level - 1; i < 6; i++) {
						getSectionEnd(sections[i], lines, top - 1);
						sections[i] = undefined;
					}
					const section = token.text().trim() || ' ',
						name = names.has(section)
							? new Array(names.size).fill('').map((_, i) => `${section.trim()}_${i + 2}`)
								.find(s => !names.has(s))!
							: section,
						container = sections.slice(0, level - 1).reverse().find(Boolean),
						selectionRange = {
							start: {line: top, character: left - level},
							end: getEndPos(top, left, width + level, height),
						},
						info = {
							name,
							kind: 15,
							range: {start: selectionRange.start},
							selectionRange,
						} as DocumentSymbol;
					names.add(name);
					sections[level - 1] = info;
					if (container) {
						container.children ??= [];
						container.children.push(info);
					} else {
						symbols.push(info);
					}
				} else {
					for (let i = level - 1; i < 6; i++) {
						const startLine = levels[i];
						if (startLine !== undefined && startLine < top - 1) {
							ranges.push({
								startLine,
								endLine: top - 1,
								kind: 'region',
							});
						}
						levels[i] = undefined;
					}
					levels[level - 1] = top + height - 1; // 从标题的最后一行开始折叠
				}
			} else if (!symbol && height > 2) {
				ranges.push({
					startLine: top, // 从表格或模板的第一行开始折叠
					endLine: top + height - 2,
					kind: 'region',
				});
			}
		}
		if (symbol) {
			for (const section of sections) {
				getSectionEnd(section, lines, length - 1);
			}
		} else {
			for (const startLine of levels) {
				if (startLine !== undefined && startLine < length - 1) {
					ranges.push({
						startLine,
						endLine: length - 1,
						kind: 'region',
					});
				}
			}
		}
		return symbol ? symbols : ranges;
	}

	/**
	 * 提供折叠范围
	 * @param text 源代码
	 */
	async provideFoldingRanges(text: string): Promise<FoldingRange[]> {
		return this.#provideFoldingRangesOrDocumentSymbols(text);
	}

	/**
	 * 提供章节
	 * @param text 源代码
	 */
	async provideDocumentSymbols(text: string): Promise<DocumentSymbol[]> {
		return this.#provideFoldingRangesOrDocumentSymbols(text, true);
	}

	/**
	 * 提供链接
	 * @param text 源代码
	 */
	async provideLinks(text: string): Promise<DocumentLink[]> {
		const srcTags = new Set(['templatestyles', 'img']),
			citeTags = new Set(['blockquote', 'del', 'ins', 'q']),
			linkTypes = new Set<TokenTypes>(['link-target', 'template-name', 'invoke-module']),
			protocolRegex = new RegExp(`^(?:${Parser.getConfig().protocol}|//)`, 'iu'),
			root = await this.#queue(text),
			selector = 'link-target,template-name,invoke-module,magic-link,ext-link-url,free-ext-link,attr-value,'
			+ 'image-parameter#link';
		return root.querySelectorAll(selector).flatMap(token => {
			const {type, parentNode, firstChild, lastChild, childNodes} = token,
				{name, tag} = parentNode as AttributeToken;
			if (
				!(type !== 'attr-value' || name === 'src' && srcTags.has(tag) || name === 'cite' && citeTags.has(tag))
				|| !isPlain(childNodes)
			) {
				return [];
			}
			let target = type === 'image-parameter'
				? AstElement.prototype.toString.call(token, true).trim()
				: token.toString(true).trim();
			try {
				if (type === 'magic-link') {
					if (target.startsWith('ISBN')) {
						target = getUrl(`Special:Booksources/${target.slice(4).replace(/[\p{Zs}\t-]/gu, '')}`);
					} else {
						target = target.startsWith('RFC')
							? `https://tools.ietf.org/html/rfc${target.slice(3).trim()}`
							: `https://pubmed.ncbi.nlm.nih.gov/${target.slice(4).trim()}`;
					}
				} else if (
					linkTypes.has(type)
					|| type === 'attr-value' && name === 'src' && tag === 'templatestyles'
					|| type === 'image-parameter' && !protocolRegex.test(target)
				) {
					if (target.startsWith('/')) {
						return [];
					}
					let ns = 0;
					if (type === 'template-name' || type === 'attr-value') {
						ns = 10;
					} else if (type === 'invoke-module') {
						ns = 828;
					}
					target = getUrl(target, ns);
				}
				if (target.startsWith('//')) {
					target = `https:${target}`;
				}
				target = new URL(target).href;
				if (type === 'image-parameter') {
					const rect = firstChild!.getBoundingClientRect(),
						{top, left, height, width} = lastChild!.getBoundingClientRect();
					return [
						{
							range: {
								start: {line: rect.top, character: rect.left},
								end: getEndPos(top, left, width, height),
							},
							target,
						},
					];
				}
				const {top, left, height, width} = token.getBoundingClientRect();
				return [
					{
						range: {
							start: {line: top, character: left},
							end: getEndPos(top, left, width, height),
						},
						target,
					},
				];
			} catch {
				return [];
			}
		});
	}
}

classes['LanguageService'] = __filename;
