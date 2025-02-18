import * as path from 'path';
import {splitColors, numToHex} from '@bhsd/common';
import {htmlAttrs, extAttrs, commonHtmlAttrs} from '../util/sharable';
import {getEndPos} from '../util/lint';
import {tidy} from '../util/string';
import Parser from '../index';
import type {
	Range,
	Position,
	ColorInformation,
	ColorPresentation,
	CompletionItemKind,
	FoldingRange,
	DocumentSymbol,
	DocumentLink,
	Location,
	WorkspaceEdit,
	Diagnostic as DiagnosticBase,
	TextEdit,
	Hover,
	SignatureHelp,
	SignatureInformation,
	ParameterInformation,
	InlayHint,

	/* NOT FOR BROWSER ONLY */

	CodeAction,
} from 'vscode-languageserver-types';
import type {
	Config,
	TokenTypes,
	LanguageService as LanguageServiceBase,
	CompletionItem,
	SignatureData,
	SignatureInfo,
} from '../base';
import type {CaretPosition} from '../lib/element';
import type {
	AstNodes,
	Token,
	AstText,
	AttributeToken,
	ParameterToken,
	HeadingToken,
	ExtToken,
	DoubleUnderscoreToken,
	ArgToken,
	LinkToken,
	FileToken,
	CategoryToken,
	RedirectTargetToken,
	ImageParameterToken,
	TranscludeToken,
	MagicLinkToken,
} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

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
declare interface QuickFixData extends TextEdit {
	title: string;
	fix: boolean;
}
declare interface Diagnostic extends DiagnosticBase {
	data: QuickFixData[];
}

export const tasks = new WeakMap<object, LanguageService>();

const refTags = new Set(['ref']),
	referencesTags = new Set(['ref', 'references']),
	nameAttrs = new Set(['name', 'extends', 'follow']),
	groupAttrs = new Set(['group']),
	renameTypes = new Set<TokenTypes>([
		'arg-name',
		'template-name',
		'magic-word-name',
		'link-target',
		'parameter-key',
	]),
	referenceTypes = new Set<TokenTypes>([
		'ext',
		'html',
		'attr-key',
		'image-parameter',
		'heading-title',
		'heading',
		...renameTypes,
	]),
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
 * Create a range.
 * @param root root token
 * @param start start index
 * @param end end index
 */
const createRange = (root: Token, start: number, end: number): Range => ({
	start: positionAt(root, start),
	end: positionAt(root, end),
});

/**
 * Create the range of a token.
 * @param token
 */
const createNodeRange = (token: Token): Range => {
	const {top, left, height, width} = token.getBoundingClientRect();
	return {
		start: {line: top, character: left},
		end: getEndPos(top, left, height, width),
	};
};

/**
 * Get completion items.
 * @param words words to choose from
 * @param kind completion item kind
 * @param mt matched text
 * @param pos position
 * @param pos.line line number
 * @param pos.character character number
 * @param extra extra text
 */
const getCompletion = (
	words: Iterable<string>,
	kind: keyof typeof CompletionItemKind,
	mt: string,
	{line, character}: Position,
	extra?: string,
): CompletionItem[] => [...new Set(words)].map((w): CompletionItem => ({
	label: w,
	kind,
	textEdit: {
		range: {
			start: {line, character: character - mt.length},
			end: {line, character},
		},
		newText: w + (extra ?? ''),
	},
}));

/**
 * Create the URL of a page.
 * @param articlePath article path
 * @param page page name
 * @param ns namespace
 * @throws `Error` Article path is not set.
 */
const getUrl = (articlePath: string | undefined, page: string, ns?: number): string => {
	/* istanbul ignore if */
	if (!articlePath?.includes('//')) {
		throw new Error('Article path is not set.');
	}
	const title = Parser.normalizeTitle(page, ns);
	/* istanbul ignore if */
	if (!title.valid) {
		throw new RangeError('Invalid page name.');
	}
	return title.getUrl();
};

/**
 * Get the caret position at the position from a word.
 * @param root root token
 * @param pos position
 */
const caretPositionFromWord = (root: Token, pos: Position): CaretPosition => {
	const {line, character} = pos,
		index = root.indexFromPos(line, character)!;
	return root.caretPositionFromIndex(index + Number(/\w/u.test(root.toString().charAt(index))))!;
};

/**
 * Get the token at the position from a word.
 * @param root root token
 * @param pos position
 */
const elementFromWord = (root: Token, pos: Position): Token => {
	const {offsetNode} = caretPositionFromWord(root, pos);
	return offsetNode.type === 'text' ? offsetNode.parentNode! : offsetNode;
};

/**
 * Get the attribute of a `<ref>` tag.
 * @param token attribute token
 * @param tags tag names
 * @param names attribute names
 */
const getRefAttr = (token: Token, tags: Set<string>, names: Set<string>): string | number => {
	const {type, parentNode = {}} = token,
		{name, tag} = parentNode as AttributeToken;
	return type === 'attr-value' && tags.has(tag) && names.has(name) ? token.toString().trim() : NaN;
};

/**
 * Get the `name` attribute of a `<ref>` tag.
 * @param token `name` attribute token
 */
const getRefName = (token: Token): string | number => getRefAttr(token, refTags, nameAttrs);

/**
 * Get the `group` attribute of a `<ref>` or `<references>` tag.
 * @param token `group` attribute token
 */
const getRefGroup = (token: Token): string | number => getRefAttr(token, referencesTags, groupAttrs);

/**
 * Get the attribute of a `<ref>` tag.
 * @param tokens attribute tokens
 * @param target attribute name
 */
const getRefTagAttr = (tokens: readonly Token[] | undefined, target: string): string | false => {
	const attr = (tokens?.find(({name}) => name === target) as AttributeToken | undefined)?.getValue();
	return attr !== true && attr || false;
};

/**
 * Get the effective name of a token.
 * @param token
 */
const getName = (token: Token): string | number | undefined => {
	const {type, name, parentNode} = token;
	switch (type) {
		case 'heading':
			return (token as HeadingToken).level;
		case 'heading-title':
			return (parentNode as HeadingToken).level;
		case 'parameter-key':
			return `${parentNode!.parentNode!.name}|${parentNode!.name}`;
		case 'ext':
		case 'html':
		case 'image-parameter':
			return name;
		default:
			return parentNode!.name;
	}
};

/* NOT FOR BROWSER ONLY */

/**
 * Get the end position of a section.
 * @param section section
 * @param lines lines
 * @param line line number
 */
const getSectionEnd = (section: DocumentSymbol | undefined, lines: [string, number, number][], line: number): void => {
	if (section) {
		const [, start, end] = lines[line]!;
		section.range.end = {line, character: end - start};
	}
};

/* NOT FOR BROWSER ONLY END */

/** VSCode-style language service */
export class LanguageService implements LanguageServiceBase {
	#text: string;
	#running: Promise<Token> | undefined;
	#done: Token;
	#config: Config | string;
	#completionConfig: CompletionConfig | undefined;
	#signature?: boolean;
	/** @private */
	data?: SignatureData;

	/** @param uri 任务标识 */
	constructor(uri: object) {
		tasks.set(uri, this);

		/* NOT FOR BROWSER ONLY */

		this.data = require(path.join('..', '..', 'data', 'signatures')) as SignatureData;
	}

	/** @implements */
	destroy(): void {
		Object.setPrototypeOf(this, null);
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
		text = tidy(text);
		if (this.#text === text && this.#config === Parser.config && !this.#running) {
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
				const config = Parser.getConfig();
				this.#config = Parser.config;
				const text = this.#text,
					root = Parser.parse(text, true, undefined, config);
				if (this.#text === text && this.#config === Parser.config) {
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
	 * 检查是否为签名语言服务器
	 * @throws `Error` 是签名语言服务器
	 */
	#checkSignature(): void {
		/* istanbul ignore if */
		if (this.#signature) {
			throw new Error('This is a signature language server!');
		}
	}

	/**
	 * 提供颜色指示
	 * @param rgba 颜色解析函数
	 * @param text 源代码
	 * @param hsl 是否允许HSL颜色
	 */
	async provideDocumentColors(
		rgba: (s: string) => [number, number, number, number] | [],
		text: string,
		hsl = true,
	): Promise<ColorInformation[]> {
		this.#checkSignature();
		const root = await this.#queue(text);
		return root.querySelectorAll('attr-value,parameter-value,arg-default')
			.flatMap(({type, childNodes}) => {
				if (type !== 'attr-value' && !isPlain(childNodes)) {
					return [];
				}
				return childNodes.filter((child): child is AstText => child.type === 'text').reverse()
					.flatMap(child => {
						const parts = splitColors(child.data, hsl).filter(([,,, isColor]) => isColor);
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
								range: createRange(root, start + from, start + to),
							};
						}).filter(Boolean) as ColorInformation[];
					});
			});
	}

	/** @implements */
	provideColorPresentations( // eslint-disable-line @typescript-eslint/class-methods-use-this
		{color: {red, green, blue, alpha}, range}: ColorInformation,
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
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions, es-x/no-regexp-unicode-property-escapes
			/(?:<\/?(\w*)|(\{{2,4}|\[\[)\s*([^|{}<>[\]\s][^|{}<>[\]#]*)?|(__(?:(?!__)[\p{L}\d_])*)|(?<!\[)\[([a-z:/]*)|\[\[\s*(?:file|image)\s*:[^[\]{}<>]+\|([^[\]{}<>|=]*)|<(\w+)(?:\s(?:[^<>{}|=\s]+(?:\s*=\s*(?:[^\s"']\S*|(["']).*?\8))?(?=\s))*)?\s(\w*))$/iu;
			const re = new RegExp(
				'(?:' // eslint-disable-line prefer-template
				+ String.raw`<(\/?\w*)` // tag
				+ '|'
				+ String.raw`(\{{2,4}|\[\[)\s*([^|{}<>[\]\s][^|{}<>[\]#]*)?` // braces and brackets
				+ '|'
				+ String.raw`(__(?:(?!__)[\p{L}\d_])*)` // behavior switch
				+ '|'
				+ String.raw`(?<!\[)\[([a-z:/]*)` // protocol
				+ '|'
				+ String.raw`\[\[\s*(?:${
					Object.entries(nsid).filter(([, v]) => v === 6).map(([k]) => k).join('|')
				})\s*:[^[\]{}<>]+\|([^[\]{}<>|=]*)` // image parameter
				+ '|'
				// attribute key
				+ String.raw`<(\w+)(?:\s(?:[^<>{}|=\s]+(?:\s*=\s*(?:[^\s"']\S*|(["']).*?\8))?(?=\s))*)?\s(\w*)`
				+ ')$',
				'iu',
			);
			this.#completionConfig = {
				re,
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
	async provideCompletionItems(text: string, position: Position): Promise<CompletionItem[] | undefined> {
		this.#checkSignature();
		const {re, allTags, functions, switches, protocols, params, tags, ext} = this.#prepareCompletionConfig(),
			{line, character} = position,
			curLine = text.split(/\r?\n/u, line + 1)[line],
			mt = re.exec(curLine?.slice(0, character) ?? '');
		if (mt?.[1] !== undefined) { // tag
			const closing = mt[1].startsWith('/');
			return getCompletion(
				allTags,
				'Class',
				mt[1].slice(closing ? 1 : 0),
				position,
				closing && !curLine?.slice(character).trim().startsWith('>') ? '>' : '',
			);
		} else if (mt?.[4]) { // behavior switch
			return getCompletion(switches, 'Constant', mt[4], position);
		} else if (mt?.[5] !== undefined) { // protocol
			return getCompletion(protocols, 'Reference', mt[5], position);
		}
		const root = await this.#queue(text);
		let cur: Token | undefined;
		if (mt?.[2]) {
			cur = root.elementFromPoint(mt.index + mt[2].length - 1, line)!;
			const match = mt[3] ?? '';
			if (mt[2] === '{{{') { // argument
				return getCompletion(
					root.querySelectorAll<ArgToken>('arg').filter(token => token.name && token !== cur)
						.map(({name}) => name),
					'Variable',
					match,
					position,
				);
			}
			const colon = match.startsWith(':'),
				str = colon ? match.slice(1).trimStart() : match;
			return mt[2] === '[['
				? getCompletion( // link
					root.querySelectorAll<LinkToken | FileToken | CategoryToken | RedirectTargetToken>(
						'link,file,category,redirect-target',
					).filter(token => token !== cur).map(({name}) => name),
					'Folder',
					str,
					position,
				)
				: [ // parser function or template
					...getCompletion(functions, 'Function', match, position),
					...match.startsWith('#')
						? []
						: getCompletion(
							root.querySelectorAll<TranscludeToken>('template').filter(token => token !== cur)
								.map(token => {
									const {name} = token;
									if (colon) {
										return name;
									}
									const {ns} = token.getAttribute('title');
									if (ns === 0) {
										return `:${name}`;
									}
									return ns === 10 ? name.slice(9) : name;
								}),
							'Folder',
							str,
							position,
						),
				];
		}
		let type: TokenTypes | undefined,
			parentNode: Token | undefined;
		if (mt?.[7] === undefined) {
			cur = root.elementFromPoint(character, line)!;
			({type, parentNode} = cur);
		}
		if (mt?.[6] !== undefined || type === 'image-parameter') { // image parameter
			const match = mt?.[6]?.trimStart()
				?? this.#text.slice(
					cur!.getAbsoluteIndex(),
					root.indexFromPos(position.line, position.character),
				).trimStart();
			return [
				...getCompletion(params, 'Property', match, position),
				...getCompletion(
					root.querySelectorAll<ImageParameterToken>('image-parameter#width').filter(token => token !== cur)
						.map(width => width.text()),
					'Unit',
					match,
					position,
				),
			];
		} else if (mt?.[7] !== undefined || type === 'attr-key') { // attribute key
			const tag = mt?.[7]?.toLowerCase() ?? (parentNode as AttributeToken).tag,
				key = mt?.[9] ?? cur!.toString();
			if (!tags.has(tag)) {
				return undefined;
			}
			const thisHtmlAttrs = htmlAttrs[tag],
				thisExtAttrs = extAttrs[tag],
				extCompletion = thisExtAttrs && getCompletion(thisExtAttrs, 'Field', key, position);
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
			const key = cur!.toString().trimStart();
			return key
				? getCompletion(
					root.querySelectorAll<ParameterToken>('parameter').filter(
						token => token !== parentNode
							&& !token.anon
							&& token.parentNode!.type === 'template'
							&& token.parentNode!.name === parentNode!.parentNode!.name,
					).map(({name}) => name),
					'Variable',
					key,
					position,
				)
				: undefined;
		}
		return undefined;
	}

	/**
	 * 提供语法诊断
	 * @param wikitext 源代码
	 * @param warning 是否提供警告
	 */
	async provideDiagnostics(wikitext: string, warning = true): Promise<Diagnostic[]> {
		this.#checkSignature();
		const root = await this.#queue(wikitext),
			errors = root.lint();
		return (warning ? errors : errors.filter(({severity}) => severity === 'error'))
			.map(({startLine, startCol, endLine, endCol, severity, rule, message, fix, suggestions}): Diagnostic => ({
				range: {
					start: {line: startLine, character: startCol},
					end: {line: endLine, character: endCol},
				},
				severity: severity === 'error' ? 1 : 2,
				source: 'WikiLint',
				code: rule,
				message,
				data: [
					...fix
						? [
							{
								range: createRange(root, ...fix.range),
								newText: fix.text,
								title: `Fix: ${fix.desc}`,
								fix: true,
							} satisfies QuickFixData,
						]
						: [],
					...suggestions
						? suggestions.map(({range, text, desc}): QuickFixData => ({
							range: createRange(root, ...range),
							newText: text,
							title: `Suggestion: ${desc}`,
							fix: false,
						}))
						: [],
				],
			}));
	}

	/**
	 * 提供折叠范围或章节
	 * @param text 源代码
	 * @param fold 是否提供折叠范围
	 */
	async #provideFoldingRangesOrDocumentSymbols(text: string): Promise<FoldingRange[]>;
	async #provideFoldingRangesOrDocumentSymbols(text: string, fold: false): Promise<DocumentSymbol[]>;
	async #provideFoldingRangesOrDocumentSymbols(
		text: string,
		fold = true,
	): Promise<FoldingRange[] | DocumentSymbol[]> {
		this.#checkSignature();
		const ranges: FoldingRange[] = [],
			symbols: DocumentSymbol[] = [],

			/* NOT FOR BROWSER ONLY */

			names = new Set<string>(),
			sections = new Array<DocumentSymbol | undefined>(6),

			/* NOT FOR BROWSER ONLY END */

			root = await this.#queue(text),
			lines = root.getLines(),
			{length} = lines,
			levels = new Array<number | undefined>(6),
			tokens = root.querySelectorAll<Token>(fold ? 'heading-title,table,template,magic-word' : 'heading-title');
		for (const token of [...tokens].reverse()) {
			token.getRelativeIndex();
		}
		for (const token of tokens) {
			const {
				top,
				height,

				/* NOT FOR BROWSER ONLY */

				left,
				width,
			} = token.getBoundingClientRect();
			if (token.type === 'heading-title') {
				const {level} = token.parentNode as HeadingToken;
				if (fold) {
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

					/* NOT FOR BROWSER ONLY */
				} else {
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
							end: getEndPos(top, left, height, width + level),
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

					/* NOT FOR BROWSER ONLY END */
				}
			} else if (fold && height > 2) {
				ranges.push({
					startLine: top, // 从表格或模板的第一行开始折叠
					endLine: top + height - 2,
					kind: 'region',
				});
			}
		}
		if (fold) {
			for (const startLine of levels) {
				if (startLine !== undefined && startLine < length - 1) {
					ranges.push({
						startLine,
						endLine: length - 1,
						kind: 'region',
					});
				}
			}

			/* NOT FOR BROWSER ONLY */
		} else {
			for (const section of sections) {
				getSectionEnd(section, lines, length - 1);
			}

			/* NOT FOR BROWSER ONLY END */
		}
		return fold ? ranges : symbols;
	}

	/**
	 * 提供折叠范围
	 * @param text 源代码
	 */
	async provideFoldingRanges(text: string): Promise<FoldingRange[]> {
		return this.#provideFoldingRangesOrDocumentSymbols(text);
	}

	/**
	 * 提供链接
	 * @param text 源代码
	 */
	async provideLinks(text: string): Promise<DocumentLink[]> {
		this.#checkSignature();
		/^(?:http:\/\/|\/\/)/iu; // eslint-disable-line @typescript-eslint/no-unused-expressions
		const {articlePath, protocol} = Parser.getConfig(),
			protocolRegex = new RegExp(`^(?:${protocol}|//)`, 'iu'),
			extSelector = 'magic-link,ext-link-url,free-ext-link,attr-value,image-parameter#link',
			fullSelector = `link-target,template-name,invoke-module,${extSelector}`,
			selector = articlePath?.includes('//') ? fullSelector : extSelector;
		return (await this.#queue(text)).querySelectorAll(selector).reverse().map((token): DocumentLink | false => {
			const {type, parentNode, firstChild, lastChild, childNodes} = token,
				{name, tag} = parentNode as AttributeToken;
			if (
				!(
					type !== 'attr-value'
					|| name === 'src' && ['templatestyles', 'img'].includes(tag)
					|| name === 'cite' && ['blockquote', 'del', 'ins', 'q'].includes(tag)
				)
				|| !isPlain(childNodes)
			) {
				return false;
			}
			let target: URL | string = childNodes.filter((node): node is AstText => node.type === 'text')
				.map(({data}) => data).join('').trim();
			if (!target) {
				return false;
			}
			try {
				if (
					token.is<MagicLinkToken>('magic-link')
					|| token.is<MagicLinkToken>('ext-link-url')
					|| token.is<MagicLinkToken>('free-ext-link')
				) {
					target = token.getUrl(articlePath);
				} else if (
					type === 'link-target' && (
						parentNode!.is<LinkToken>('link')
						|| parentNode!.is<RedirectTargetToken>('redirect-target')
						|| parentNode!.is<CategoryToken>('category')
					)
				) {
					if (target.startsWith('/')) {
						return false;
					}
					target = parentNode.link.getUrl(articlePath);
				} else if (type === 'template-name') {
					target = parentNode!.getAttribute('title').getUrl(articlePath);
				} else if (
					['link-target', 'invoke-module'].includes(type)
					|| type === 'attr-value' && name === 'src' && tag === 'templatestyles'
					|| type === 'image-parameter' && !protocolRegex.test(target)
				) {
					if (target.startsWith('/')) {
						return false;
					}
					let ns = 0;
					if (type === 'attr-value') {
						ns = 10;
					} else if (type === 'invoke-module') {
						ns = 828;
					}
					target = getUrl(articlePath, target, ns);
				}
				if (typeof target === 'string' && target.startsWith('//')) {
					target = `https:${target}`;
				}
				target = new URL(target).href;
				if (type === 'image-parameter') {
					const {top, left, height, width} = lastChild!.getBoundingClientRect(),
						rect = firstChild!.getBoundingClientRect();
					return {
						range: {
							start: {line: rect.top, character: rect.left},
							end: getEndPos(top, left, height, width),
						},
						target,
					};
				}
				return {range: createNodeRange(token), target};
			} catch {
				return false;
			}
		}).filter(Boolean) as DocumentLink[];
	}

	/**
	 * 提供引用
	 * @param text 源代码
	 * @param position 位置
	 */
	async provideReferences(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined> {
		this.#checkSignature();
		const root = await this.#queue(text),
			node = elementFromWord(root, position),
			{type} = node,
			refName = getRefName(node),
			refGroup = getRefGroup(node);
		if (!refName && !refGroup && !referenceTypes.has(type)) {
			return undefined;
		}
		const name = getName(node),
			refs = root.querySelectorAll(type === 'heading-title' ? 'heading' : type).filter(
				token => type === 'attr-value'
					? getRefName(token) === refName || getRefGroup(token) === refGroup
					: getName(token) === name,
			).map((token): Omit<Location, 'uri'> => ({
				range: createNodeRange(token.type === 'parameter-key' ? token.parentNode! : token),
			}));
		return refs.length === 0 ? undefined : refs;
	}

	/**
	 * 提供定义
	 * @param text 源代码
	 * @param position 位置
	 */
	async provideDefinition(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined> {
		this.#checkSignature();
		const root = await this.#queue(text),
			node = elementFromWord(root, position),
			attrs = (node.is<ExtToken>('ext') && node.name === 'ref' ? node : node.closest<ExtToken>('ext#ref'))
				?.firstChild.childNodes,
			refName = getRefTagAttr(attrs, 'name');
		if (!refName) {
			return undefined;
		}
		const refGroup = getRefTagAttr(attrs, 'group'),
			refs = root.querySelectorAll<ExtToken>('ext#ref').filter(
				({firstChild: {childNodes}, innerText}) => innerText
					&& getRefTagAttr(childNodes, 'name') === refName
					&& getRefTagAttr(childNodes, 'group') === refGroup,
			).map(({lastChild}): Omit<Location, 'uri'> => ({
				range: createNodeRange(lastChild),
			}));
		return refs.length === 0 ? undefined : refs;
	}

	/**
	 * 提供变量更名准备
	 * @param text 源代码
	 * @param position 位置
	 */
	async resolveRenameLocation(text: string, position: Position): Promise<Range | undefined> {
		this.#checkSignature();
		const root = await this.#queue(text),
			node = elementFromWord(root, position),
			{type} = node,
			refName = getRefName(node),
			refGroup = getRefGroup(node);
		return !refName && !refGroup && (
			!renameTypes.has(type)
			|| type === 'parameter-key' && /^[1-9]\d*$/u.test(node.parentNode!.name!)
			|| type === 'link-target' && !['link', 'redirect-target'].includes(node.parentNode!.type)
		)
			? undefined
			: createNodeRange(node);
	}

	/**
	 * 变量更名
	 * @param text 源代码
	 * @param position 位置
	 * @param newName 新名称
	 */
	async provideRenameEdits(text: string, position: Position, newName: string): Promise<WorkspaceEdit | undefined> {
		this.#checkSignature();
		const root = await this.#queue(text),
			node = elementFromWord(root, position),
			{type} = node,
			refName = getRefName(node),
			refGroup = getRefGroup(node);
		const name = getName(node),
			refs = root.querySelectorAll(type).filter(token => {
				const {type: t} = token.parentNode!;
				if (type === 'link-target' && t !== 'link' && t !== 'redirect-target') {
					return false;
				}
				return type === 'attr-value'
					? getRefName(token) === refName || getRefGroup(token) === refGroup
					: getName(token) === name;
			});
		return refs.length === 0
			? undefined
			: {
				changes: {
					'': refs.map((ref): TextEdit => ({
						range: createNodeRange(ref),
						newText: newName,
					})),
				},
			};
	}

	/**
	 * 检索解析器函数
	 * @param name 函数名
	 */
	#getParserFunction(name: string): SignatureInfo | undefined {
		return this.data!.parserFunctions.find(({aliases}) => aliases.some(alias => alias.replace(/^#/u, '') === name));
	}

	/**
	 * 提供悬停信息
	 * @param text 源代码
	 * @param position 位置
	 */
	async provideHover(text: string, position: Position): Promise<Hover | undefined> {
		/* istanbul ignore next */
		if (!this.data) {
			return undefined;
		}
		this.#checkSignature();
		const root = await this.#queue(text),
			caret = caretPositionFromWord(root, position),
			{offsetNode, offset} = caret,
			token = offsetNode.type === 'text' ? offsetNode.parentNode! : offsetNode,
			{type, parentNode, length, name} = token;
		let info: SignatureData['parserFunctions'][0] | undefined,
			f: string | undefined,
			range: Range | undefined;
		if (token.is<DoubleUnderscoreToken>('double-underscore')) {
			info = this.data.behaviorSwitches.find(
				({aliases}) => aliases.includes(token.innerText.toLowerCase()),
			);
		} else if (type === 'magic-word-name') {
			info = this.#getParserFunction(parentNode!.name!);
			f = token.text().trim();
		} else if (token.is<TranscludeToken>('magic-word') && length === 1 && !token.modifier) {
			info = this.#getParserFunction(name!);
			f = token.firstChild.text().trim();
		} else if (
			(token.is<TranscludeToken>('magic-word') || token.is<TranscludeToken>('template'))
			&& token.modifier
		) {
			const rIndex = token.getRelativeIndex(0);
			if (offset >= 2 && rIndex > offset) {
				const aIndex = token.getAbsoluteIndex();
				f = token.modifier.trim().slice(0, -1);
				info = this.#getParserFunction(f.toLowerCase());
				range = {
					start: positionAt(root, aIndex + 2),
					end: positionAt(root, aIndex + token.modifier.trimEnd().length + 1),
				};
			}
		}
		return info && {
			contents: {
				kind: 'markdown',
				value: (
					info.signatures
						? `${info.signatures.map(
							params => `- **{{ ${f}${params.length === 0 ? '**' : ':** '}${
								params.map(({label, const: c}) => c ? label : `*${label}*`).join(' **|** ')
							} **}}**`,
						).join('\n')}\n\n`
						: ''
				)
				+ info.description,
			},
			range: range ?? createNodeRange(token),
		};
	}

	/**
	 * 提供魔术字帮助
	 * @param text 源代码
	 * @param position 位置
	 */
	async provideSignatureHelp(text: string, position: Position): Promise<SignatureHelp | undefined> {
		/* istanbul ignore next */
		if (!this.data) {
			return undefined;
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		} else if (this.#text !== undefined && !this.#signature) {
			throw new Error('This is a regular language server!');
		}
		this.#signature = true;
		const {line, character} = position,
			curLine = text.split(/\r?\n/u, line + 1)[line]!,
			{lastChild} = await this.#queue(
				`${curLine.slice(0, character + /^[^{}<]*/u.exec(curLine.slice(character))![0].length)}}}`,
			);
		if (!lastChild!.is<TranscludeToken>('magic-word')) {
			return undefined;
		}
		const {name, childNodes, firstChild} = lastChild,
			info = this.#getParserFunction(name);
		if (!info?.signatures) {
			return undefined;
		}
		const n = childNodes.length - 1,
			candidates = info.signatures.filter(
				params => (params.length >= n || params[params.length - 1]?.rest)
					&& params.every(({label, const: c}, i) => {
						const p = c && i < n && childNodes[i + 1]?.text().trim();
						return !p || label.includes(p) || label.includes(p.toLowerCase());
					}),
			);
		if (candidates.length === 0) {
			return undefined;
		}
		let j = 0;
		if (n === 0) {
			j = -1;
		} else {
			for (let cur = lastChild.getAbsoluteIndex() + lastChild.getRelativeIndex(1); j < n; j++) {
				cur += childNodes[j + 1]!.toString().length + 1;
				if (cur > character) {
					break;
				}
			}
		}
		const f = firstChild.text().trim(),
			signatures = candidates.map((params): SignatureInformation => ({
				label: `{{${f}${params.length === 0 ? '' : ':'}${params.map(({label}) => label).join('|')}}}`,
				parameters: params.map(({label, const: c}): ParameterInformation => ({
					label,
					...c ? {documentation: 'Predefined parameter'} : undefined,
				})),
				...params.length < n ? {activeParameter: Math.min(j, params.length - 1)} : undefined,
			}));
		return {signatures, activeParameter: j};
	}

	/**
	 * 提供 CodeLens
	 * @param text 源代码
	 */
	async provideInlayHints(text: string): Promise<InlayHint[]> {
		this.#checkSignature();
		const hints: InlayHint[] = [],
			root = await this.#queue(text);
		for (const template of root.querySelectorAll<TranscludeToken>('template,magic-word#invoke')) {
			const {type, childNodes} = template;
			hints.push(
				...(childNodes.slice(type === 'template' ? 1 : 3) as ParameterToken[]).filter(({anon}) => anon)
					.reverse().map((parameter): InlayHint => ({
						position: positionAt(root, parameter.getAbsoluteIndex()),
						label: `${parameter.name}=`,
						kind: 2,
					})),
			);
		}
		return hints;
	}

	/* NOT FOR BROWSER ONLY */

	/** @implements */
	// eslint-disable-next-line @typescript-eslint/class-methods-use-this
	provideCodeAction(diagnostics: Diagnostic[]): CodeAction[] {
		return diagnostics.flatMap(
			diagnostic => diagnostic.data.map((data): CodeAction => ({
				title: data.title,
				kind: 'quickfix',
				diagnostics: [diagnostic],
				isPreferred: data.fix,
				edit: {
					changes: {'': [data]},
				},
			})),
		);
	}

	/**
	 * 提供章节
	 * @param text 源代码
	 */
	async provideDocumentSymbols(text: string): Promise<DocumentSymbol[]> {
		return this.#provideFoldingRangesOrDocumentSymbols(text, false);
	}
}

classes['LanguageService'] = __filename;
