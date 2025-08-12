import {
	splitColors,
	numToHex,
	getRegex,
} from '@bhsd/common';
import {htmlAttrs, extAttrs, commonHtmlAttrs} from '../util/sharable';
import {getEndPos, provideValues} from '../util/lint';
import {tidy} from '../util/string';
import Parser from '../index';
import type {
	Range,
	Position,
	ColorInformation,
	ColorPresentation,
	CompletionItemKind,
	FoldingRange,
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
	CodeAction,
} from 'vscode-languageserver-types';
import type {
	Config,
	TokenTypes,
	LanguageService as LanguageServiceBase,
	CompletionItem,
	SignatureData,
	SignatureInfo,
	LintError,
} from '../base';
import type {CaretPosition} from '../lib/element';
import type {
	Token,
	AstText,
	AttributeToken,
	ParameterToken,
	HeadingToken,
	ExtToken,
	AttributesToken,
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
declare interface Diagnostic extends DiagnosticBase {
	data: QuickFixData[];
}

export interface QuickFixData extends TextEdit {
	title: string;
	fix: boolean;
}

export const tasks = new WeakMap<object, LanguageService>();

const refTags = new Set(['ref']),
	referencesTags = new Set(['ref', 'references']),
	nameAttrs = new Set(['name', 'follow']),
	groupAttrs = new Set(['group']),
	renameTypes = new Set<TokenTypes>([
		'arg-name',
		'template-name',
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
		'magic-word-name',
		...renameTypes,
	]),
	plainTypes = new Set<TokenTypes | 'text'>(['text', 'comment', 'noinclude', 'include']),
	cssSelector = ['ext', 'html', 'table'].map(s => `${s}-attr#style`).join();
const getLinkRegex = getRegex(protocol => new RegExp(`^(?:${protocol}|//)`, 'iu'));

/**
 * Check if a token is a plain attribute.
 * @param token
 * @param token.type
 * @param token.parentNode
 * @param token.length
 * @param token.firstChild
 * @param style whether it is a style attribute
 */
export const isAttr = ({type, parentNode, length, firstChild}: Token, style?: boolean): boolean | undefined =>
	type === 'attr-value' && length === 1 && firstChild!.type === 'text'
	&& (
		!style
		|| parentNode!.name === 'style'
	);

/**
 * Check if a token is an HTML attribute.
 * @param token
 */
const isHtmlAttr = (token: Token): token is AttributeToken =>
	token.is<AttributeToken>('html-attr') || token.is<AttributeToken>('table-attr');

/**
 * Check if all child nodes are plain text or comments.
 * @param token
 */
const isPlain = (token: Token): boolean => token.childNodes.every(({type}) => plainTypes.has(type));

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
 * @param getDoc documentation method
 */
const getCompletion = (
	words: Iterable<string>,
	kind: keyof typeof CompletionItemKind,
	mt: string,
	{line, character}: Position,
	extra?: string,
	getDoc?: (name: string) => SignatureInfo | undefined,
): CompletionItem[] => [...new Set(words)].map((w): CompletionItem => {
	const doc = getDoc?.(w)?.description;
	return {
		label: w,
		kind,
		textEdit: {
			range: {
				start: {line, character: character - mt.length},
				end: {line, character},
			},
			newText: w + (extra ?? ''),
		},
		...doc && {
			documentation: {
				kind: 'markdown',
				value: doc,
			},
		},
	};
});

/**
 * Get the caret position at the position from a word.
 * @param root root token
 * @param text source code
 * @param pos position
 * @param pos.line line number
 * @param pos.character character number
 */
const caretPositionFromWord = (root: Token, text: string, {line, character}: Position): CaretPosition => {
	const index = root.indexFromPos(line, character)!;
	return root.caretPositionFromIndex(index + Number(/\w/u.test(text.charAt(index))))!;
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
 * @param token extension token
 * @param target attribute name
 */
const getRefTagAttr = (token: ExtToken | AttributesToken | undefined, target: string): string | false => {
	const attr = token?.getAttr(target);
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
 * Get the quick fix data.
 * @param root root token
 * @param fix lint error fix
 * @param preferred whether it is a preferred fix
 */
const getQuickFix = (root: Token, fix: LintError.Fix, preferred = false): QuickFixData => ({
	range: createRange(root, ...fix.range),
	newText: fix.text,
	title: `${preferred ? 'Fix' : 'Suggestion'}: ${fix.desc}`,
	fix: preferred,
});

/** VSCode-style language service */
export class LanguageService implements LanguageServiceBase {
	#text: string;
	#text2: string;
	#running: Promise<Token> | undefined;
	#running2: Promise<Token> | undefined;
	#done: Token;
	#done2: Token;
	#config: Config | string;
	#include: boolean;
	#completionConfig: [CompletionConfig, Config] | undefined;
	/** @since v1.17.1 */
	include = true;
	/** @private */
	config?: Config;
	/** @private */
	data?: SignatureData;

	/** @param uri 任务标识 */
	constructor(uri: object) {
		tasks.set(uri, this);
		Object.defineProperties(this, {
			config: {enumerable: false},
			data: {
				enumerable: false,
			},
		});
	}

	/** @implements */
	destroy(): void {
		Object.setPrototypeOf(this, null);
	}

	/** 检查解析设置有无更新 */
	#checkConfig(): boolean {
		return this.#config === this.config && this.#include === this.include;
	}

	/**
	 * 提交解析任务
	 * @param text 源代码
	 * @description
	 * - 总是更新`#text`以便`#parse`完成时可以判断是否需要重新解析
	 * - 如果已有进行中或已完成的解析，则返回该解析的结果
	 * - 否则开始新的解析
	 */
	async #queue(text: string): Promise<Token> {
		text = tidy(text);
		if (!this.#running && this.#checkConfig() && this.#text === text) {
			return this.#done;
		}
		this.#text = text;
		this.#running ??= this.#parse(); // 不要提交多个解析任务
		return this.#running;
	}

	/**
	 * 执行解析
	 * @description
	 * - 完成后会检查`#text`是否已更新，如果是则重新解析
	 * - 总是返回最新的解析结果
	 */
	async #parse(): Promise<Token> {
		this.config ??= Parser.getConfig();
		this.#config = this.config;
		this.#include = this.include;
		const text = this.#text,
			root = await Parser.partialParse(text, () => this.#text, this.include, this.config);
		if (this.#checkConfig() && this.#text === text) {
			this.#done = root;
			this.#running = undefined;
			return root;
		}
		/* istanbul ignore next */
		this.#running = this.#parse();
		/* istanbul ignore next */
		return this.#running;
	}

	/**
	 * 提交签名解析任务
	 * @param text 源代码
	 * @description
	 * - 总是更新`#text2`以便`#parseSignature`完成时可以判断是否需要重新解析
	 * - 如果已有进行中或已完成的解析，则返回该解析的结果
	 * - 否则开始新的解析
	 */
	async #queueSignature(text: string): Promise<Token> {
		text = tidy(text);
		if (!this.#running2 && this.#checkConfig() && this.#text2 === text) {
			return this.#done2;
		}
		this.#text2 = text;
		this.#running2 ??= this.#parseSignature(); // 不要提交多个解析任务
		return this.#running2;
	}

	/**
	 * 执行签名解析
	 * @description
	 * - 完成后会检查`#text2`是否已更新，如果是则重新解析
	 * - 总是返回最新的解析结果
	 */
	async #parseSignature(): Promise<Token> {
		this.config ??= Parser.getConfig();
		this.#config = this.config;
		this.#include = this.include;
		const text = this.#text2,
			root = await Parser.partialParse(text, () => this.#text2, this.include, this.config);
		if (this.#checkConfig() && this.#text2 === text) {
			this.#done2 = root;
			this.#running2 = undefined;
			return root;
		}
		/* istanbul ignore next */
		this.#running2 = this.#parseSignature();
		/* istanbul ignore next */
		return this.#running2;
	}

	/**
	 * Provide color decorators
	 *
	 * 提供颜色指示
	 * @param rgba color parser / 颜色解析函数
	 * @param text source Wikitext / 源代码
	 * @param hsl whether HSL colors are treated / 是否允许HSL颜色
	 */
	async provideDocumentColors(
		rgba: (s: string) => [number, number, number, number] | [],
		text: string,
		hsl = true,
	): Promise<ColorInformation[]> {
		const root = await this.#queue(text);
		return root.querySelectorAll('attr-value,parameter-value,arg-default').reverse()
			.flatMap(token => {
				const {
					type,
					childNodes,
				} = token;
				if (type !== 'attr-value' && !isPlain(token)) {
					return [];
				}
				return childNodes.filter((child): child is AstText => child.type === 'text').reverse()
					.flatMap(child => {
						const {data} = child,
							parts = splitColors(data, hsl).filter(([,,, isColor]) => isColor);
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

	/**
	 * Provide color pickers
	 *
	 * 颜色选择器
	 * @param color color information / 颜色信息
	 */
	// eslint-disable-next-line @typescript-eslint/class-methods-use-this
	provideColorPresentations(color: ColorInformation): ColorPresentation[] {
		const {color: {red, green, blue, alpha}, range} = color,
			rgb = [red, green, blue],
			newText = alpha < 1
				? `rgba(${rgb.map(c => Math.round(c * 255)).join()},${alpha})`
				: `#${rgb.map(numToHex).join('')}`;
		return [
			{
				label: newText,
				textEdit: {range, newText},
			},
		];
	}

	/** 准备自动补全设置 */
	#prepareCompletionConfig(): CompletionConfig {
		if (!this.#completionConfig || this.#completionConfig[1] !== this.config) {
			this.config ??= Parser.getConfig();
			const {
					nsid,
					ext,
					html,
					parserFunction: [insensitive, sensitive, ...other],
					doubleUnderscore,
					protocol,
					img,
				} = this.config,
				tags = new Set([ext, html].flat(2));
			const re = new RegExp(
				'(?:' // eslint-disable-line prefer-template
				+ String.raw`<(\/?\w*)` // tag
				+ '|'
				+ String.raw`(\{{2,4}|\[\[)\s*([^|{}<>[\]\s][^|{}<>[\]#]*)?` // braces and brackets
				+ '|'
				+ String.raw`(__(?:(?!__)[\p{L}\p{N}_])*)` // behavior switch
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
			this.#completionConfig = [
				{
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
					params: Object.keys(img)
						.filter(k => k.endsWith('$1') || !k.includes('$1'))
						.map(k => k.replace(/\$1$/u, '')),
				},
				this.config,
			];
		}
		return this.#completionConfig[0];
	}

	/**
	 * Provide auto-completion
	 *
	 * 提供自动补全
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	async provideCompletionItems(text: string, position: Position): Promise<CompletionItem[] | undefined> {
		const {re, allTags, functions, switches, protocols, params, tags, ext} = this.#prepareCompletionConfig(),
			{line, character} = position,
			curLine = text.split(/\r?\n/u, line + 1)[line],
			mt = re.exec(curLine?.slice(0, character) ?? ''),
			[,, iAlias = {}, sAlias = {}] = this.config!.doubleUnderscore;
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
			return getCompletion(
				switches,
				'Constant',
				mt[4],
				position,
				'',
				name => {
					if (!this.data) {
						return undefined;
					}
					name = name.slice(2, -2);
					if (name in iAlias) {
						name = iAlias[name]!;
					} else if (name in sAlias) {
						name = sAlias[name]!;
					}
					return this.#getBehaviorSwitch(name.toLowerCase());
				},
			);
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
			const [insensitive, sensitive] = this.config!.parserFunction,
				isOld = Array.isArray(sensitive),
				next = curLine!.charAt(character),
				colon = match.startsWith(':'),
				str = colon ? match.slice(1).trimStart() : match;
			if (mt[2] === '[[') { // link
				return getCompletion(
					root.querySelectorAll<LinkToken | FileToken | CategoryToken | RedirectTargetToken>(
						'link,file,category,redirect-target',
					).filter(token => token !== cur).map(({name}) => name),
					'Folder',
					str,
					position,
				);
			}
			// parser function or template
			let words = functions;
			if (next === ':') {
				words = functions.filter(s => !s.endsWith('：'));
			} else if (next === '：') {
				words = functions.filter(s => s.endsWith('：')).map(s => s.slice(0, -1));
			}
			return [
				...getCompletion(
					words,
					'Function',
					match,
					position,
					'',
					name => {
						if (!this.data) {
							return undefined;
						} else if (name in insensitive) {
							name = insensitive[name]!;
						} else if (!isOld && name in sensitive) {
							name = sensitive[name]!;
						}
						return this.#getParserFunction(name.toLowerCase());
					},
				),
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
			const index = root.indexFromPos(line, character)!,
				match = mt?.[6]?.trimStart()
					?? this.#text.slice(cur!.getAbsoluteIndex(), index).trimStart(),
				equal = this.#text[index] === '=';
			return [
				...getCompletion(params, 'Property', match, position)
					.filter(({label}) => !equal || !/[= ]$/u.test(label)),
				...getCompletion(
					root.querySelectorAll<ImageParameterToken>('image-parameter#width')
						.filter(token => token !== cur)
						.map(width => width.text()),
					'Unit',
					match,
					position,
				),
			];
		} else if (mt?.[7] !== undefined || type === 'attr-key') { // attribute key
			const tag = mt?.[7]?.toLowerCase() ?? (parentNode as AttributeToken).tag,
				key = mt?.[9]
					?? cur!.toString().slice(0, character - root.posFromIndex(cur!.getAbsoluteIndex())!.left);
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
		} else if (type === 'parameter-key' || type === 'parameter-value' && (parentNode as ParameterToken).anon) {
			// parameter key
			const transclusion = (parentNode as ParameterToken).parentNode!,
				{type: t, name: n} = transclusion;
			if (t === 'magic-word' && n !== 'invoke') {
				return undefined;
			}
			const key = this.#text.slice(cur!.getAbsoluteIndex(), root.indexFromPos(line, character)).trimStart(),
				{module: mod, function: func} = transclusion;
			return key
				? getCompletion(
					root.querySelectorAll<ParameterToken>('parameter').filter(token => {
						if (
							token === parentNode
							|| token.anon
							|| token.parentNode!.type !== t
							|| token.parentNode!.name !== n
						) {
							return false;
						} else if (t === 'template') {
							return true;
						}
						return token.parentNode!.module === mod && token.parentNode!.function === func;
					}).map(({name}) => name),
					'Variable',
					key,
					position,
					type === 'parameter-value' ? '=' : '',
				)
				: undefined;
		} else if (isAttr(cur!) && isHtmlAttr(parentNode!)) {
			const data = provideValues(parentNode.tag, parentNode.name);
			if (data.length === 0) {
				return undefined;
			}
			const val = this.#text.slice(cur!.getAbsoluteIndex(), root.indexFromPos(line, character)).trimStart();
			return getCompletion(data, 'Value', val, position);
		}
		return undefined;
	}

	/**
	 * Provide grammar check
	 *
	 * 提供语法检查
	 * @param text source Wikitext / 源代码
	 * @param warning whether to include warnings / 是否包含警告
	 */
	async provideDiagnostics(text: string, warning = true): Promise<DiagnosticBase[]> {
		const root = await this.#queue(text),
			errors = root.lint(),
			diagnostics = (warning ? errors : errors.filter(({severity}) => severity === 'error')).map(
				({
					startLine,
					startCol,
					endLine,
					endCol,
					severity,
					rule,
					message,
					fix,
					suggestions,
				}): Diagnostic => ({
					range: {
						start: {line: startLine, character: startCol},
						end: {line: endLine, character: endCol},
					},
					severity: severity === 'error' ? 1 : 2,
					source:
						'WikiLint',
					code:
						rule,
					message,
					data: [
						...fix ? [getQuickFix(root, fix, true)] : [],
						...suggestions ? suggestions.map(suggestion => getQuickFix(root, suggestion)) : [],
					],
				}),
			),
			cssDiagnostics =
				[] as const,
			jsonDiagnostics =
				[] as const;
		return [
			diagnostics,
			cssDiagnostics,
			jsonDiagnostics,
		].flat(2);
	}

	/**
	 * Provide folding ranges
	 *
	 * 提供折叠范围
	 * @param text source Wikitext / 源代码
	 */
	async provideFoldingRanges(text: string): Promise<FoldingRange[]> {
		const root = await this.#queue(text),
			{length} = root.getLines(),
			ranges: FoldingRange[] = [],
			levels = new Array<number | undefined>(6),
			tokens = root.querySelectorAll<Token>('heading-title,table,template,magic-word');
		for (const token of [...tokens].reverse()) { // 提高 getBoundingClientRect 的性能
			token.getRelativeIndex();
		}
		for (const token of tokens) {
			const {offsetHeight} = token;
			if (token.type === 'heading-title' || offsetHeight > 2) {
				const {top} = root.posFromIndex(token.getAbsoluteIndex())!;
				if (token.type === 'heading-title') {
					const {level} = token.parentNode as HeadingToken;
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
					levels[level - 1] = top + offsetHeight - 1; // 从标题的最后一行开始折叠
				} else {
					ranges.push({
						startLine: top, // 从表格或模板的第一行开始折叠
						endLine: top + offsetHeight - 2,
						kind: 'region',
					});
				}
			}
		}
		for (const startLine of levels) {
			if (startLine !== undefined && startLine < length - 1) {
				ranges.push({
					startLine,
					endLine: length - 1,
					kind: 'region',
				});
			}
		}
		return ranges;
	}

	/**
	 * Provide links
	 *
	 * 提供链接
	 * @param text source Wikitext / 源代码
	 */
	async provideLinks(text: string): Promise<DocumentLink[]> {
		this.config ??= Parser.getConfig();
		const {articlePath, protocol} = this.config,
			absolute = articlePath?.includes('//'),
			protocolRegex = getLinkRegex(protocol);
		return (await this.#queue(text))
			.querySelectorAll(`magic-link,ext-link-url,free-ext-link,attr-value,image-parameter#link${
				absolute ? ',link-target,template-name,invoke-module,magic-word#filepath,magic-word#widget' : ''
			}`)
			.reverse()
			.map((token): DocumentLink | false => {
				let name: string | undefined;
				if (token.is<TranscludeToken>('magic-word')) {
					({name} = token);
					token = (token.childNodes[1] as ParameterToken).lastChild; // eslint-disable-line no-param-reassign
				}
				const {type, parentNode, firstChild, lastChild, childNodes, length} = token,
					{tag} = parentNode as AttributeToken;
				name ??= parentNode!.name;
				if (
					!(
						type !== 'attr-value'
						|| name === 'src' && ['templatestyles', 'img'].includes(tag)
						|| name === 'cite' && ['blockquote', 'del', 'ins', 'q'].includes(tag)
					)
					|| !isPlain(token)
				) {
					return false;
				}
				let target: URL | string = childNodes.filter((node): node is AstText => node.type === 'text')
					.map(({data}) => data)
					.join('')
					.trim();
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
						['link-target', 'invoke-module', 'parameter-value'].includes(type)
						|| type === 'attr-value' && name === 'src' && tag === 'templatestyles'
						|| type === 'image-parameter' && !protocolRegex.test(target)
					) {
						if (!absolute || target.startsWith('/')) {
							return false;
						}
						let ns = 0;
						switch (type) {
							case 'attr-value':
								ns = 10;
								break;
							case 'invoke-module':
								ns = 828;
								break;
							case 'parameter-value':
								ns = name === 'filepath' ? 6 : 274;
							// no default
						}
						const title = Parser
							.normalizeTitle(target, ns, false, this.config, {temporary: true});
						if (!title.valid) {
							return false;
						}
						target = title.getUrl();
					}
					if (typeof target === 'string' && target.startsWith('//')) {
						target = `https:${target}`;
					}
					target = new URL(target).href;
					if (type === 'image-parameter') {
						const rect = firstChild!.getBoundingClientRect(),
							{top, left, height, width} = length === 1 ? rect : lastChild!.getBoundingClientRect();
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
			})
			.filter(Boolean) as DocumentLink[];
	}

	/**
	 * Provide references
	 *
	 * 提供引用
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	async provideReferences(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined> {
		const root = await this.#queue(text),
			{offsetNode, offset} = caretPositionFromWord(root, this.#text, position),
			element = offsetNode.type === 'text' ? offsetNode.parentNode! : offsetNode,
			node = offset === 0 && (element.type === 'ext-attr-dirty' || element.type === 'html-attr-dirty')
				? element.parentNode!.parentNode!
				: element,
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
			).reverse().map((token): Omit<Location, 'uri'> => ({
				range: createNodeRange(token.type === 'parameter-key' ? token.parentNode! : token),
			}));
		return refs.length === 0 ? undefined : refs;
	}

	/**
	 * Provide definitions
	 *
	 * 提供定义
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	async provideDefinition(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined> {
		const root = await this.#queue(text),
			node = root.elementFromPoint(position.character, position.line)!,
			ext = node.is<ExtToken>('ext') && node.name === 'ref'
				? node
				: node.closest<ExtToken>('ext#ref'),
			refName = getRefTagAttr(ext, 'name');
		if (!refName) {
			return undefined;
		}
		const refGroup = getRefTagAttr(ext, 'group'),
			refs = root.querySelectorAll<ExtToken>('ext#ref').filter(
				token => token.innerText
					&& getRefTagAttr(token, 'name') === refName
					&& getRefTagAttr(token, 'group') === refGroup,
			).reverse().map(({lastChild}): Omit<Location, 'uri'> => ({
				range: createNodeRange(lastChild),
			}));
		return refs.length === 0 ? undefined : refs;
	}

	/**
	 * Provide locations for renaming
	 *
	 * 提供变量更名准备
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	async resolveRenameLocation(text: string, position: Position): Promise<Range | undefined> {
		const root = await this.#queue(text),
			node = root.elementFromPoint(position.character, position.line)!,
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
	 * Provide rename edits
	 *
	 * 变量更名
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 * @param newName new name / 新名称
	 */
	async provideRenameEdits(text: string, position: Position, newName: string): Promise<WorkspaceEdit | undefined> {
		const root = await this.#queue(text),
			node = root.elementFromPoint(position.character, position.line)!,
			{type} = node,
			refName = getRefName(node),
			refNameGroup = refName && getRefTagAttr(node.parentNode!.parentNode as AttributesToken, 'group'),
			refGroup = getRefGroup(node),
			name = getName(node),
			refs = root.querySelectorAll(type).filter(token => {
				const {type: t} = token.parentNode!;
				if (type === 'link-target' && t !== 'link' && t !== 'redirect-target') {
					return false;
				}
				return type === 'attr-value'
					? getRefGroup(token) === refGroup
					|| getRefName(token) === refName
					&& getRefTagAttr(token.parentNode!.parentNode as AttributesToken, 'group') === refNameGroup
					: getName(token) === name;
			});
		return refs.length === 0
			? undefined
			: {
				changes: {
					'': refs.reverse().map((ref): TextEdit => ({
						range: createNodeRange(ref),
						newText: newName,
					})),
				},
			};
	}

	/**
	 * 检索状态开关
	 * @param name 魔术字名
	 */
	#getBehaviorSwitch(name: string): SignatureInfo | undefined {
		return this.data!.behaviorSwitches.find(({aliases}) => aliases.includes(name));
	}

	/**
	 * 检索解析器函数
	 * @param name 函数名
	 */
	#getParserFunction(name: string): SignatureInfo | undefined {
		return this.data!.parserFunctions
			.find(({aliases}) => aliases.some(alias => alias.replace(/^#/u, '') === name));
	}

	/**
	 * Provide hover information
	 *
	 * 提供悬停信息
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	async provideHover(text: string, position: Position): Promise<Hover | undefined> {
		/* istanbul ignore next */
		if (!this.data) {
			return undefined;
		}
		const root = await this.#queue(text);
		let {offsetNode, offset} = caretPositionFromWord(root, this.#text, position);
		if (offsetNode.type === 'text') {
			offset += offsetNode.getRelativeIndex();
			offsetNode = offsetNode.parentNode!;
		}
		const {type, parentNode, length, name} = offsetNode;
		let info: SignatureData['parserFunctions'][0] | undefined,
			f: string | undefined,
			colon: string | undefined,
			range: Range | undefined;
		if (offsetNode.is<DoubleUnderscoreToken>('double-underscore') && offset > 0) {
			info = this.#getBehaviorSwitch(offsetNode.name);
		} else if (type === 'magic-word-name') {
			info = this.#getParserFunction(parentNode!.name!);
			f = offsetNode.text().trim();
			colon = parentNode!.getAttribute('colon');
		} else if (
			offsetNode.is<TranscludeToken>('magic-word') && !offsetNode.modifier && length === 1
			&& (offset > 0 || root.posFromIndex(offsetNode.getAbsoluteIndex())!.left === position.character)
		) {
			info = this.#getParserFunction(name!);
			f = offsetNode.firstChild.text().trim();
			colon = offsetNode.getAttribute('colon');
		} else if (
			(offsetNode.is<TranscludeToken>('magic-word') || offsetNode.is<TranscludeToken>('template'))
			&& offsetNode.modifier && offset >= 2 && offsetNode.getRelativeIndex(0) > offset
		) {
			f = offsetNode.modifier.trim().slice(0, -1);
			info = this.#getParserFunction(f.toLowerCase());
			colon = ':';
			if (info) {
				const aIndex = offsetNode.getAbsoluteIndex();
				range = {
					start: positionAt(root, aIndex + 2),
					end: positionAt(root, aIndex + offsetNode.modifier.trimEnd().length + 1),
				};
			}
		}
		return info && {
			contents: {
				kind: 'markdown',
				value: (
					info.signatures
						? `${info.signatures.map(
							params => `- **{{ ${f}${params.length === 0 ? '**' : `${colon}** `}${
								params.map(({label, const: c}) => c ? label : `*${label}*`).join(' **|** ')
							} **}}**`,
						).join('\n')}\n\n`
						: ''
				)
				+ info.description,
			},
			range: range ?? createNodeRange(offsetNode),
		};
	}

	/**
	 * Provide signature help for magic words
	 *
	 * 提供魔术字帮助
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	async provideSignatureHelp(text: string, position: Position): Promise<SignatureHelp | undefined> {
		/* istanbul ignore next */
		if (!this.data) {
			return undefined;
		}
		const {line, character} = position,
			curLine = text.split(/\r?\n/u, line + 1)[line]!,
			{lastChild} = await this.#queueSignature(
				`${curLine.slice(0, character + /^[^{}<]*/u.exec(curLine.slice(character))![0].length)}}}`,
			);
		if (!lastChild!.is<TranscludeToken>('magic-word') || lastChild.length === 1) {
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
						return !p || label.toLowerCase().includes(p.toLowerCase());
					}),
			);
		if (candidates.length === 0) {
			return undefined;
		}
		let j = -1;
		for (let cur = lastChild.getAbsoluteIndex() + lastChild.getAttribute('padding'); j < n; j++) {
			cur += childNodes[j + 1]!.toString().length + 1;
			if (cur > character) {
				break;
			}
		}
		const f = firstChild.text().trim(),
			colon = lastChild.getAttribute('colon');
		return {
			signatures: candidates.map((params): SignatureInformation => ({
				label: `{{${f}${params.length === 0 ? '' : colon}${
					params.map(({label}) => label).join('|')
				}}}`,
				parameters: params.map(({label, const: c}): ParameterInformation => ({
					label,
					...c ? {documentation: 'Predefined parameter'} : undefined,
				})),
				...params.length < n ? {activeParameter: Math.min(j, params.length - 1)} : undefined,
			})),
			activeParameter: j,
		};
	}

	/**
	 * Provide CodeLens
	 *
	 * 提供 CodeLens
	 * @param text source Wikitext / 源代码
	 * @since v1.16.3
	 */
	async provideInlayHints(text: string): Promise<InlayHint[]> {
		const root = await this.#queue(text);
		let hints: InlayHint[] = [];
		for (const token of root.querySelectorAll<TranscludeToken>('template,magic-word#invoke').reverse()) {
			const {type, childNodes} = token;
			hints = [
				...hints,
				...(childNodes.slice(type === 'template' ? 1 : 3) as ParameterToken[]).filter(({anon}) => anon)
					.reverse()
					.map((parameter): InlayHint => ({
						position: positionAt(root, parameter.getAbsoluteIndex()),
						label: `${parameter.name}=`,
						kind: 2,
					})),
			];
		}
		return hints;
	}

	/** @private */
	findStyleTokens(): AttributeToken[] {
		return this.#done.querySelectorAll<AttributeToken>(cssSelector).filter(({lastChild}) => isAttr(lastChild));
	}

	/**
	 * Provide refactoring actions
	 *
	 * 提供重构操作
	 * @param text source Wikitext / 源代码
	 * @param range range of the refactoring / 重构范围
	 * @since v1.24.0
	 */
	async provideRefactoringAction(text: string, range?: Range): Promise<CodeAction[]> {
		let lines: string[],
			selected: string;
		if (range) {
			const {start, end} = range;
			if (start.line === end.line && start.character === end.character) {
				return [];
			}
			lines = text.split(/\r?\n/u, end.line + 1);
			selected = start.line === end.line
				? lines[end.line]!.slice(start.character, end.character)
				: `${lines[start.line]!.slice(start.character)}\n${
					lines.slice(start.line + 1, end.line).join('\n')
				}${lines.length === 2 ? '' : '\n'}${lines[end.line]!.slice(0, end.character)}`;
		} else if (text) {
			lines = text.split(/\r?\n/u);
			selected = lines.join('\n');
			range = {
				start: {line: 0, character: 0},
				end: {line: lines.length - 1, character: lines[lines.length - 1]!.length},
			};
		} else {
			return [];
		}
		const root = await this.#queueSignature(selected);
		const {viewOnly} = Parser;
		Parser.viewOnly = false;
		root.escape();
		Parser.viewOnly = viewOnly;
		return [
			{
				title: 'Escape with magic words',
				kind: 'refactor.rewrite',
				edit: {
					changes: {
						'': [{range, newText: root.toString()}],
					},
				},
			},
		];
	}
}
