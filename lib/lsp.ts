import {splitColors, numToHex} from '@bhsd/common';
import {htmlAttrs, extAttrs, commonHtmlAttrs} from '../util/sharable';
import {getEndPos} from '../util/lint';
import Parser from '../index';
import {AstElement} from '../lib/element';
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
} from 'vscode-languageserver-types';
import type {
	Config,
	TokenTypes,
	LanguageService as LanguageServiceBase,
	CompletionItem,
	SignatureData,
	SignatureInfo,
} from '../base';
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
} from '../internal';

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
 */
const getCompletion = (
	words: Iterable<string>,
	kind: keyof typeof CompletionItemKind,
	mt: string,
	{line, character}: Position,
): CompletionItem[] => [...new Set(words)].map((w): CompletionItem => ({
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

/**
 * Get the token at the position from a word.
 * @param root root token
 * @param pos position
 */
const elementFromWord = (root: Token, pos: Position): Token => {
	const {line, character} = pos,
		index = root.indexFromPos(line, character)!,
		offset = Number(/[\w!#]/u.test(root.toString().charAt(index)));
	return root.elementFromIndex(index + offset)!;
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

/**
 * Make sure that the token is not the one at the position.
 * @param token
 * @param index position index
 */
const not = (token: Token, index: number): boolean => token.getAbsoluteIndex() !== index;

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
		text = text.replace(/\r$/gmu, '');
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
				return childNodes.filter((child): child is AstText => child.type === 'text')
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
			const re = new RegExp(
				'(?:' // eslint-disable-line prefer-template
				+ String.raw`<\/?(\w*)` // tag
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
			mt = re.exec(text.split(/\r?\n/u, line + 1)[line]?.slice(0, character) ?? '');
		if (mt?.[1] !== undefined) { // tag
			return getCompletion(allTags, 'Class', mt[1], position);
		} else if (mt?.[4]) { // behavior switch
			return getCompletion(switches, 'Constant', mt[4], position);
		} else if (mt?.[5] !== undefined) { // protocol
			return getCompletion(protocols, 'Reference', mt[5], position);
		}
		const root = await this.#queue(text),
			index = root.indexFromPos(line, mt?.index ?? character)!;
		if (mt?.[2]) {
			const match = mt[3] ?? '';
			if (mt[2] === '{{{') { // argument
				return getCompletion(
					root.querySelectorAll<ArgToken>('arg').filter(token => token.name && not(token, index))
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
					).filter(token => not(token, index)).map(({name}) => name),
					'Folder',
					str,
					position,
				)
				: [ // parser function or template
					...getCompletion(functions, 'Function', match, position),
					...match.startsWith('#')
						? []
						: getCompletion(
							root.querySelectorAll<TranscludeToken>('template')
								.filter(token => not(token, index + (mt[2] === '{{' ? 0 : 2)))
								.map(({name}) => colon ? name : name.replace(/^Template:/u, '')),
							'Folder',
							str,
							position,
						),
				];
		}
		let cur: Token | undefined,
			type: TokenTypes | undefined,
			parentNode: Token | undefined;
		if (!mt) {
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
					root.querySelectorAll<ImageParameterToken>('image-parameter#width')
						.filter(token => cur ? token !== cur : not(token.parentNode!, index))
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
			root = await this.#queue(text),
			lines = root.getLines(),
			{length} = lines,
			levels = new Array<number | undefined>(6),
			tokens = root.querySelectorAll<Token>(fold ? 'heading-title,table,template,magic-word' : 'heading-title');
		for (const token of tokens) {
			const {
				top,
				height,
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
		const protocolRegex = new RegExp(`^(?:${Parser.getConfig().protocol}|//)`, 'iu'),
			selector = 'link-target,template-name,invoke-module,magic-link,ext-link-url,free-ext-link,attr-value,'
				+ 'image-parameter#link';
		return (await this.#queue(text)).querySelectorAll(selector).flatMap((token): DocumentLink[] => {
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
					['link-target', 'template-name', 'invoke-module'].includes(type)
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
								end: getEndPos(top, left, height, width),
							},
							target,
						},
					];
				}
				return [{range: createNodeRange(token), target}];
			} catch {
				return [];
			}
		});
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
		const token = elementFromWord(await this.#queue(text), position);
		let info: SignatureData['parserFunctions'][0] | undefined,
			f: string | undefined;
		if (token.is<DoubleUnderscoreToken>('double-underscore')) {
			info = this.data.behaviorSwitches.find(
				({aliases}) => aliases.includes(token.innerText.toLowerCase()),
			);
		} else if (token.type === 'magic-word-name') {
			info = this.#getParserFunction(token.parentNode!.name!);
			f = token.text().trim();
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
			range: createNodeRange(token),
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
			),
			{type, name, childNodes, firstChild} = lastChild!;
		if (type !== 'magic-word') {
			return undefined;
		}
		const info = this.#getParserFunction(name!);
		if (!info?.signatures) {
			return undefined;
		}
		const f = firstChild!.text().trim(),
			n = childNodes.length - 1,
			start = lastChild!.getAbsoluteIndex();
		let activeParameter = childNodes.findIndex(child => child.getRelativeIndex() > character - start) - 2;
		if (activeParameter === -3) {
			activeParameter = n - 1;
		}
		const signatures = info.signatures.filter(
			params => (params.length >= n || params[params.length - 1]?.rest)
				&& params.every(({label, const: c}, i) => {
					const p = c && i < n && childNodes[i + 1]?.text().trim();
					return !p || label.startsWith(p) || label.startsWith(p.toLowerCase());
				}),
		).map((params): SignatureInformation => ({
			label: `{{${f}${params.length === 0 ? '' : ':'}${params.map(({label}) => label).join('|')}}}`,
			parameters: params.map(({label, const: c}): ParameterInformation => ({
				label,
				...c ? {documentation: 'Predefined parameter'} : undefined,
			})),
			...params.length < n ? {activeParameter: Math.min(activeParameter, params.length - 1)} : undefined,
		}));
		return {signatures, activeParameter};
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
					.map((parameter): InlayHint => ({
						position: positionAt(root, parameter.getAbsoluteIndex()),
						label: `${parameter.name}=`,
						kind: 2,
					})),
			);
		}
		return hints;
	}
}
