import {
	splitColors,
	numToHex,
	getRegex,

	/* NOT FOR BROWSER ONLY */

	sanitizeInlineStyle,
} from '@bhsd/common';
import {isUnderscore} from '@bhsd/cm-util';
import {rules} from '../base';
import {htmlAttrs, extAttrs, commonHtmlAttrs} from '../util/sharable';
import {getEndPos, provideValues} from '../util/lint';
import {tidy} from '../util/string';
import {Shadow} from '../util/debug';
import {
	MAX_STAGE,

	/* NOT FOR BROWSER ONLY */

	mathTags,
} from '../util/constants';
import Parser from '../index';
import {Token} from '../src/index';
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

	/* NOT FOR BROWSER ONLY */

	DocumentSymbol,
} from 'vscode-languageserver-types';
import type {
	Config,
	TokenTypes,
	LanguageService as LanguageServiceBase,
	CompletionItem,
	SignatureData,
	SignatureInfo,
	LintError,
	LintRuleConfig,

	/* NOT FOR BROWSER ONLY */

	ConfigData,
} from '../base';
import type {CaretPosition} from '../lib/element';
import type {
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
	AtomToken,
} from '../internal';

/* NOT FOR BROWSER ONLY */

import fs from 'fs';
import path from 'path';
import util from 'util';
import {execFile} from 'child_process';
import {createHash} from 'crypto';
import {styleLint} from '@bhsd/stylelint-util';
import findIndex from '../util/search';
import {
	EmbeddedJSONDocument,
	EmbeddedCSSDocument,
	loadJsonLSP,
	loadCssLSP,
	jsonTags,
	loadHtmlData,
	loadStylelint,
} from './document';
import type {ExecException} from 'child_process';
import type {Dimension, Position as NodePosition} from './node';

declare interface LilyPondError {
	line: number;
	col: number;
	message: string;
}

/* NOT FOR BROWSER ONLY END */

declare interface CompletionConfig {
	re: RegExp;
	ext: string[];
	tags: Set<string>;
	allTags: string[];
	functions: string[];
	switches: string[];
	jaSwitches: string[];
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

declare interface FixAllData {
	rule?: LintError.Rule;
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
const isAttr = ({type, parentNode, length, firstChild}: Token, style?: boolean): boolean =>
	type === 'attr-value' && length === 1 && firstChild!.type === 'text'
	&& (
		!style
		|| parentNode!.name === 'style'
		&& Boolean(loadCssLSP())
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

/**
 * Get the fix-all data.
 * @param root root token
 * @param rule rule to be fixed
 */
const getFixAll = (root: Token, rule?: string): TextEdit[] => {
	const {lintConfig} = Parser,
		{rules: ruleConfig, fix, computeEditInfo} = lintConfig;
	lintConfig.fix = true;
	lintConfig.computeEditInfo = false;
	if (rule) {
		lintConfig.rules = undefined as unknown as LintRuleConfig;
		for (const key of rules) {
			lintConfig.rules[key] = key === rule ? ruleConfig[key]! : 0;
		}
	}
	const {output} = root.lint();
	lintConfig.fix = fix!;
	lintConfig.computeEditInfo = computeEditInfo!;
	if (rule) {
		lintConfig.rules = ruleConfig;
	}
	return output === undefined
		? []
		: [
			{
				range: createNodeRange(root),
				newText: output,
			},
		];
};

/**
 * Partially parse wikitext.
 * @param wikitext
 * @param watch function to watch for changes
 * @param include
 * @param config
 */
const partialParse = async (
	wikitext: string,
	watch: () => string,
	include: boolean,
	config = Parser.getConfig(),
): Promise<Token> => {
	const set = typeof setImmediate === 'function' ? setImmediate : /* istanbul ignore next */ setTimeout,
		{running} = Shadow;
	Shadow.running = true;

	/* PRINT ONLY */

	const {internal} = Parser;
	Parser.internal = true;

	/* PRINT ONLY END */

	/** restore state before exit */
	const finish = (): void => {
		Shadow.running = running;

		/* PRINT ONLY */

		Parser.internal = internal;
	};
	const token = new Token(tidy(wikitext), config);
	token.type = 'root';
	let i = 0;
	try {
		await new Promise<void>(resolve => {
			const /** @ignore */ check = (): void => {
					if (watch() === wikitext) {
						i++;
						set(parseOnce, 0);
					} else {
						resolve();
					}
				},
				/** @ignore */ parseOnce = (): void => {
					if (i === MAX_STAGE + 1) {
						token.afterBuild();
						resolve();
					} else {
						token[i === MAX_STAGE ? 'build' : 'parseOnce'](i, include);
						check();
					}
				};
			set(parseOnce, 0);
		});
	} catch (e) /* istanbul ignore next */ {
		finish();
		throw e;
	}
	finish();
	return token;
};

/* NOT FOR BROWSER ONLY */

/** @see https://www.npmjs.com/package/stylelint-config-recommended */
const cssRules = {'block-no-empty': null},
	sources: Partial<Record<LintError.Rule, string>> = {'invalid-css': 'css', 'invalid-math': 'texvc'},
	jsonSelector = jsonTags.map(s => `ext#${s}`).join(),
	scores = new Map<string, LilyPondError[]>();
let colors: Promise<RegExp | false> | undefined;

/**
 * Correct the position of an error.
 * @param height
 * @param width
 * @param line 0-based line number
 * @param column 0-based column number
 */
const adjustPos = (height: number, width: number, line: number, column: number): [number, number] => {
	if (line === 0) {
		line = 1;
		column = 0;
	} else if (line === height + 1) {
		line = height;
		column = width;
	}
	return [line, column];
};

/**
 * Get the position of a Stylelint error.
 * @param rect bounding client rect of the token
 * @param bottom bottom of the style block
 * @param lineOrCode line number or code string
 * @param columnOrOffset column number or offset in the code string
 */
function getStylelintPos(
	rect: Dimension & NodePosition,
	bottom: number,
	lineOrCode: string,
	columnOrOffset: [number, number],
): Range;
function getStylelintPos(
	rect: Dimension & NodePosition,
	bottom: number,
	lineOrCode: number | string,
	columnOrOffset: number,
): Position;
function getStylelintPos(
	rect: Dimension & NodePosition,
	bottom: number,
	lineOrCode: number | string,
	columnOrOffset: number | [number, number],
): Position | Range {
	if (Array.isArray(columnOrOffset)) {
		return {
			start: getStylelintPos(rect, bottom, lineOrCode, columnOrOffset[0]),
			end: getStylelintPos(rect, bottom, lineOrCode, columnOrOffset[1]),
		};
	}
	const {top, left, height, width} = rect,
		start = bottom - height - 1;
	if (typeof lineOrCode === 'number') {
		return getEndPos(top, left, ...adjustPos(height, width, lineOrCode - start, columnOrOffset));
	}
	const lines = lineOrCode.slice(0, columnOrOffset).split(/\r?\n/u);
	return getStylelintPos(rect, bottom, lines.length, lines.at(-1)!.length);
}

/**
 * Convert LilyPond errors to VSCode diagnostics.
 * @param root root token
 * @param token `<score>` extension token
 * @param errors LilyPond errors
 */
const getLilyPondDiagnostics = (root: Token, token: ExtToken, errors: LilyPondError[]): DiagnosticBase[] => {
	const {top, left} = root.posFromIndex(token.lastChild.getAbsoluteIndex())!;
	return errors.map(({line, col, message}): DiagnosticBase => {
		const pos = getEndPos(top, left, line, col);
		return {
			range: {start: pos, end: pos},
			severity: 1,
			source: 'LilyPond',
			message,
		};
	});
};

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

	/* NOT FOR BROWSER ONLY */

	/** @private */
	lilypond: string;
	#lilypondData: string[];
	#mathData: string[];

	/* NOT FOR BROWSER ONLY END */

	/** @param uri 任务标识 */
	constructor(uri: object) {
		tasks.set(uri, this);

		/* NOT FOR BROWSER ONLY */

		const dataDir = path.join('..', '..', 'data'),
			extDir = path.join(dataDir, 'ext');
		this.#lilypondData = require(path.join(extDir, 'score'));
		this.#mathData = require(path.join(extDir, 'math'));

		/* NOT FOR BROWSER ONLY END */

		Object.defineProperties(this, {
			config: {enumerable: false},
			data: {
				enumerable: false,

				/* NOT FOR BROWSER ONLY */

				value: require(path.join(dataDir, 'signatures')),
			},
		});
	}

	/** @implements */
	destroy(): void {
		Object.setPrototypeOf(this, null);

		/* NOT FOR BROWSER ONLY */

		const dir = path.join(__dirname, 'lilypond');
		if (fs.existsSync(dir)) {
			for (const file of fs.readdirSync(dir)) {
				(async () => {
					try {
						await fs.promises.unlink(path.join(dir, file));
					} catch {}
				})();
			}
		}
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
			root = await partialParse(text, () => this.#text, this.include, this.config);
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
			root = await partialParse(text, () => this.#text2, this.include, this.config);
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

		/* NOT FOR BROWSER ONLY */

		colors ??= (async () => {
			try {
				return new RegExp(
					String.raw`\b${Object.keys((await import('color-name')).default).join('|')}\b`,
					'giu',
				);
			} catch {
				return false;
			}
		})();
		const re = await colors;

		/* NOT FOR BROWSER ONLY END */

		return root.querySelectorAll('attr-value,parameter-value,arg-default').reverse().flatMap(token => {
			const {
				type,
				childNodes,

				/* NOT FOR BROWSER ONLY */

				parentNode,
			} = token;
			if (type !== 'attr-value' && !isPlain(token)) {
				return [];

				/* NOT FOR BROWSER ONLY */
			} else if (isAttr(token, true)) {
				const textDoc = new EmbeddedCSSDocument(root, token);
				return loadCssLSP()!.findDocumentColors(textDoc, textDoc.styleSheet);

				/* NOT FOR BROWSER ONLY END */
			}

			/* NOT FOR BROWSER ONLY */

			const isStyle = re && type === 'attr-value' && parentNode!.name === 'style';

			/* NOT FOR BROWSER ONLY END */

			return childNodes.filter((child): child is AstText => child.type === 'text').reverse().flatMap(child => {
				const {data} = child,
					parts = splitColors(data, hsl).filter(([,,, isColor]) => isColor);

				/* NOT FOR BROWSER ONLY */

				if (isStyle) {
					parts.push(
						...[...data.matchAll(re)].map(
							({index, 0: s}): [string, number, number, true] =>
								[s, index, index + s.length, true],
						),
					);
				}

				/* NOT FOR BROWSER ONLY END */

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
				}).filter(info => info !== false);
			});
		});
	}

	/**
	 * Provide color pickers
	 *
	 * 颜色选择器
	 * @param color color information / 颜色信息
	 */
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
					+ String.raw`<(\/?\w*)` // tag ($1)
					+ '|'
					+ String.raw`(\{{2,4}|\[\[)\s*([^|{}<>[\]\s][^|{}<>[\]#]*)?` // braces and brackets ($2, $3)
					+ '|'
					+ String.raw`(_(?:_(?:(?!__|＿{2})[\p{L}\p{N}_])*)?)` // behavior switch ($4)
					+ '|'
					+ String.raw`(＿(?:＿(?:(?!__|＿{2})[\p{L}\p{N}＿])*)?)` // Japanese behavior switch ($5)
					+ '|'
					+ String.raw`(?<!\[)\[([a-z:/]*)` // protocol ($6)
					+ '|'
					+ String.raw`\[\[\s*(?:${
						Object.entries(nsid).filter(([, v]) => v === 6).map(([k]) => k).join('|')
					})\s*:[^[\]{}<>]+\|([^[\]{}<>|=]*)` // image parameter ($7)
					+ '|'
					// attribute key ($8, $10)
					+ String.raw`<(\w+)(?:\s(?:[^<>{}|=\s]+(?:\s*=\s*(?:[^\s"']\S*|(["']).*?\9))?(?=\s))*)?\s(\w*)`
					+ ')$',
					'iu',
				),
				allSwitches = (doubleUnderscore.slice(0, 2) as string[][]).flat();
			this.#completionConfig = [
				{
					re,
					ext,
					tags,
					allTags: [...tags, 'onlyinclude', 'includeonly', 'noinclude'],
					functions: [Object.keys(insensitive), Object.keys(sensitive), other].flat(2),
					switches: allSwitches.filter(isUnderscore).map(w => `__${w}__`),
					jaSwitches: allSwitches.filter(w => !isUnderscore(w)),
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
		const {
				re,
				allTags,
				functions,
				switches,
				jaSwitches,
				protocols,
				params,
				tags,
				ext,
			} = this.#prepareCompletionConfig(),
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
		} else if (mt?.[4] || mt?.[5] && jaSwitches.length > 0) { // behavior switch
			const isJa = mt[5] !== undefined;
			return getCompletion(
				isJa ? jaSwitches : switches,
				'Constant',
				mt[isJa ? 5 : 4]!,
				position,
				'',
				name => {
					if (!this.data) {
						return undefined;
					} else if (!isJa) {
						name = name.slice(2, -2);
					}
					if (name in iAlias) {
						name = iAlias[name]!;
					} else if (name in sAlias) {
						name = sAlias[name]!;
					}
					return this.#getBehaviorSwitch(name.toLowerCase());
				},
			);
		} else if (mt?.[6] !== undefined) { // protocol
			return getCompletion(protocols, 'Reference', mt[6], position);
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
						} else if (name in sensitive) {
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
		if (mt?.[8] === undefined) {
			cur = root.elementFromPoint(character, line)!;
			({type, parentNode} = cur);
		}
		if (mt?.[7] !== undefined || type === 'image-parameter') { // image parameter
			const index = root.indexFromPos(line, character)!,
				match = mt?.[7]?.trimStart()
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
		} else if (mt?.[8] !== undefined || type === 'attr-key') { // attribute key
			const tag = mt?.[8]?.toLowerCase() ?? (parentNode as AttributeToken).tag,
				key = mt?.[10]
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

			/* NOT FOR BROWSER ONLY */
		} else if (isAttr(cur!, true)) {
			const textDoc = new EmbeddedCSSDocument(root, cur!);
			return loadCssLSP()!.doComplete(textDoc, position, textDoc.styleSheet).items
				.map((item): CompletionItem => ({
					...item,
					textEdit: {
						range: (item.textEdit as TextEdit).range,
						newText: item.textEdit!.newText.replace(/\s/gu, ''),
					},
				}));
		} else if (type === 'ext-inner' && jsonTags.includes(cur!.name!)) {
			const jsonLSP = loadJsonLSP();
			if (!jsonLSP) {
				return undefined;
			}
			const textDoc = new EmbeddedJSONDocument(root, cur!);
			return (await jsonLSP.doComplete(textDoc, position, textDoc.jsonDoc))?.items;
		} else if (type === 'ext-inner' && cur!.name === 'score') {
			const lang = (parentNode as ExtToken).getAttr('lang');
			if (lang !== undefined && lang !== 'lilypond') {
				return undefined;
			}
			const before = this.#text.slice(cur!.getAbsoluteIndex(), root.indexFromPos(line, character)),
				comment = before.lastIndexOf('%');
			if (
				comment !== -1
				&& (before[comment + 1] === '{' || !before.slice(comment).includes('\n'))
			) {
				return undefined;
			}
			const word = /\\?\b(?:\w|\b(?:->?|\.)|\bly:)+$/u.exec(curLine!.slice(0, character))?.[0];
			if (word) {
				const data = this.#lilypondData;
				return word.startsWith('\\')
					? getCompletion(
						data.filter(w => w.startsWith('\\')),
						'Function',
						word,
						position,
					)
					: [
						...getCompletion(
							data.filter(w => /^[a-z]/u.test(w)),
							'Variable',
							word,
							position,
						),
						...getCompletion(
							data.filter(w => /^[A-Z]/u.test(w)),
							'Class',
							word,
							position,
						),
					];
			}
		} else if (type === 'ext-inner' && mathTags.has(cur!.name!)) {
			const word = /(?<!\\)\\[a-z]+$/iu.exec(curLine!.slice(0, character))?.[0];
			if (word) {
				const data = this.#mathData;
				return getCompletion(
					cur!.name === 'math' && (parentNode as ExtToken).hasAttr('chem')
						? [...data, String.raw`\ce`]
						: data,
					'Function',
					word,
					position,
				);
			}

			/* NOT FOR BROWSER ONLY END */
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
			{lintConfig} = Parser,
			needFix = lintConfig.fix!;
		lintConfig.fix = false;
		const errors = root.lint();
		lintConfig.fix = needFix;
		const diagnostics = (warning ? errors : errors.filter(({severity}) => severity === 'error')).map(
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

					/* NOT FOR BROWSER ONLY */

					code,
				}): Diagnostic => ({
					range: {
						start: {line: startLine, character: startCol},
						end: {line: endLine, character: endCol},
					},
					severity: severity === 'error' ? 1 : 2,
					source:
						/* eslint-disable @stylistic/operator-linebreak */
						sources[rule] ??
						'WikiLint',
					code:
						code ??
						/* eslint-enable @stylistic/operator-linebreak */
						rule,
					message,
					data: [
						...fix ? [getQuickFix(root, fix, true)] : [],
						...suggestions ? suggestions.map(suggestion => getQuickFix(root, suggestion)) : [],
					],
				}),
			),

			/* NOT FOR BROWSER ONLY */

			stylelint = await loadStylelint(),
			jsonLSP = loadJsonLSP(),

			/* NOT FOR BROWSER ONLY END */

			/* eslint-disable @stylistic/operator-linebreak */
			cssDiagnostics =
				stylelint ?
					await (async () => {
						NPM: {
							const tokens = this.findStyleTokens();
							if (tokens.length === 0) {
								return [];
							}
							const code = tokens.map(
									({type, tag, lastChild}, i) => `${type === 'ext-attr' ? 'div' : tag}#${i}{\n${
										sanitizeInlineStyle(lastChild.toString())
									}\n}`,
								).join('\n'),
								cssErrors = await styleLint(stylelint, code, cssRules);
							if (cssErrors.length === 0) {
								return [];
							}
							const rects = tokens.map(({lastChild}) => lastChild.getBoundingClientRect());
							let acc = 0;
							const bottoms = rects.map(({height}) => {
								acc += height + 2;
								return acc;
							});
							return cssErrors.map(({
								rule,
								text: msg,
								severity,
								line,
								column,
								endLine = line,
								endColumn = column,
								fix,
							}): DiagnosticBase => {
								const i = findIndex(bottoms, line, (bottom, needle) => bottom - needle);
								return {
									range: {
										start: getStylelintPos(rects[i]!, bottoms[i]!, line, column - 1),
										end: getStylelintPos(rects[i]!, bottoms[i]!, endLine, endColumn - 1),
									},
									severity: severity === 'error' ? 1 : 2,
									source: 'Stylelint',
									code: rule,
									message: msg.slice(0, msg.lastIndexOf('(') - 1),
									...fix
										? {
											data: [
												{
													range: getStylelintPos(rects[i]!, bottoms[i]!, code, fix.range),
													newText: fix.text,
													title: `Fix: ${rule}`,
													fix: true,
												} satisfies QuickFixData,
											],
										}
										: {},
								};
							});
						}
					})() :
					[] as const,
			jsonDiagnostics =
				jsonLSP ?
					await Promise.all(
						root.querySelectorAll<ExtToken>(jsonSelector).map(async ({name, lastChild, selfClosing}) => {
							if (selfClosing) {
								return [];
							}
							const textDoc = new EmbeddedJSONDocument(root, lastChild),
								severityLevel = name === 'templatedata' ? 'error' : 'ignore',
								e = (await jsonLSP.doValidation(textDoc, textDoc.jsonDoc, {
									comments: severityLevel,
									trailingCommas: severityLevel,
								})).map((error): DiagnosticBase => ({
									...error,
									source: 'json',
								}));
							return warning ? e : e.filter(({severity}) => severity === 1);
						}),
					) :
					[] as const;
			/* eslint-enable @stylistic/operator-linebreak */

		/* NOT FOR BROWSER ONLY */

		let lilypondDiagnostics: DiagnosticBase[][] = [];
		if (this.lilypond) {
			const tokens = root.querySelectorAll<ExtToken>('ext#score').filter(token => {
				const lang = token.getAttr('lang');
				return (lang === undefined || lang === 'lilypond') && token.innerText;
			});
			if (tokens.length > 0) {
				const dir = path.join(__dirname, 'lilypond');
				if (!fs.existsSync(dir)) {
					fs.mkdirSync(dir);
				}
				lilypondDiagnostics = await Promise.all(tokens.map(async (token): Promise<DiagnosticBase[]> => {
					const {innerText} = token,
						score = `showLastLength = R1${
							token.hasAttr('raw') ? `\n${innerText}` : ` \\score {\n${innerText}\n}`
						}`;
					if (scores.has(score)) {
						return getLilyPondDiagnostics(root, token, scores.get(score)!);
					}
					const hash = createHash('sha256');
					hash.update(score);
					const file = path.join(dir, `${hash.digest('hex')}.ly`);
					fs.writeFileSync(file, score);
					try {
						await util.promisify(execFile)(this.lilypond, ['-s', '-o', dir, file]);
						scores.set(score, []);
					} catch (e) {
						const {stderr} = e as ExecException;
						if (stderr) {
							const re = new RegExp(String.raw`^${file}:(\d+):(\d+): error: (.+)$`, 'gmu'),
								lilypondErrors = [...stderr.matchAll(re)].map(([, line, col, msg]): LilyPondError => {
									const {offsetHeight, offsetWidth} = token.lastChild,
										pos = adjustPos(offsetHeight, offsetWidth, Number(line) - 1, Number(col) - 1);
									return {
										line: pos[0],
										col: pos[1],
										message: msg!,
									};
								});
							scores.set(score, lilypondErrors);
							return getLilyPondDiagnostics(root, token, lilypondErrors);
						}
					}
					return [];
				}));
			}
		}

		/* NOT FOR BROWSER ONLY END */

		return [
			diagnostics,
			cssDiagnostics,
			jsonDiagnostics,

			/* NOT FOR BROWSER ONLY */

			lilypondDiagnostics,
		].flat(2);
	}

	/**
	 * Resolve fix-all code action
	 *
	 * 实现修复全部代码的操作
	 * @param action code action / 代码操作
	 * @since v1.24.1
	 */
	resolveCodeAction(action: CodeAction): CodeAction {
		if (action.kind !== 'source.fixAll') {
			return action;
		}
		const {rule} = action.data as FixAllData;
		return {
			...action,
			edit: {
				changes: {
					'': getFixAll(this.#done, rule),
				},
			},
		};
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

		/* NOT FOR BROWSER ONLY */

		const jsonLSP = loadJsonLSP();
		if (jsonLSP) {
			for (const {selfClosing, lastChild} of root.querySelectorAll<ExtToken>(jsonSelector)) {
				if (!selfClosing) {
					const foldingRanges = jsonLSP.getFoldingRanges(new EmbeddedJSONDocument(root, lastChild));
					if (foldingRanges.length > 0) {
						Array.prototype.push.apply(ranges, foldingRanges);
					}
				}
			}
		}

		/* NOT FOR BROWSER ONLY END */

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
			.querySelectorAll(`magic-link,ext-link-url,free-ext-link,attr-value${
				absolute ? ',link-target,template-name,invoke-module,magic-word#filepath,magic-word#widget' : ''
			},image-parameter#link,image-parameter#manualthumb`)
			.reverse()
			.map((token): DocumentLink | false => {
				let name: string | undefined;
				if (token.is<TranscludeToken>('magic-word')) {
					({name} = token);
					token = (token.childNodes[1] as ParameterToken).lastChild;
				} else if (token.is<ImageParameterToken>('image-parameter')) {
					({name} = token);
				}
				const {type, parentNode, firstChild, lastChild, childNodes, length} = token,
					{tag} = parentNode as AttributeToken;
				name ??= parentNode!.name;
				if (
					!(
						type !== 'attr-value'
						|| name === 'cite' && ['blockquote', 'del', 'ins', 'q'].includes(tag)
						|| name === 'src' && ['templatestyles', 'img'].includes(tag)
						|| name === 'templatename' && tag === 'rss'
						|| name === 'file' && tag === 'phonos'
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
						if (/^(?:\.\.)?\//u.test(target)) {
							return false;
						}
						target = parentNode.link.getUrl(articlePath);
					} else if (type === 'link-target' || type === 'template-name') {
						target = parentNode!.getAttribute('title').getUrl(articlePath);
					} else if (
						['invoke-module', 'parameter-value'].includes(type)
						|| type === 'attr-value' && (
							name === 'src' && tag === 'templatestyles'
							|| name === 'templatename' && tag === 'rss'
							|| name === 'file' && tag === 'phonos'
						)
						|| type === 'image-parameter' && (name === 'manualthumb' || !protocolRegex.test(target))
					) {
						if (!absolute || target.startsWith('/')) {
							return false;
						} else if (
							type === 'image-parameter' && name === 'manualthumb'
							|| type === 'parameter-value' && name === 'filepath'
							|| type === 'attr-value' && tag === 'phonos'
						) {
							target = `File:${target}`;
						} else if (type === 'parameter-value') {
							target = `Widget:${target}`;
						} else if (type === 'invoke-module') {
							target = `Module:${target}`;
						}
						const title = Parser.normalizeTitle(
							target,
							type === 'attr-value' ? 10 : 0,
							false,
							this.config,
							{temporary: true},
						);
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
			.filter(link => link !== false);
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
			node = offset === 0
				&& (element.is<AtomToken>('ext-attr-dirty') || element.is<AtomToken>('html-attr-dirty'))
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

			/* NOT FOR BROWSER ONLY */
		} else if (isAttr(offsetNode, true)) {
			const textDoc = new EmbeddedCSSDocument(root, offsetNode);
			return loadCssLSP()!.doHover(textDoc, position, textDoc.styleSheet) ?? undefined;
		} else if (type === 'ext-inner' && jsonTags.includes(name!)) {
			const jsonLSP = loadJsonLSP();
			if (!jsonLSP) {
				return undefined;
			}
			const textDoc = new EmbeddedJSONDocument(root, offsetNode);
			return await jsonLSP.doHover(textDoc, position, textDoc.jsonDoc) ?? undefined;
		} else if (
			type === 'html' && offset <= offsetNode.getRelativeIndex(0)
			|| type === 'html-attr-dirty' && offset === 0 && parentNode!.firstChild === offsetNode
		) {
			const token = type === 'html' ? offsetNode : parentNode!.parentNode!,
				data = loadHtmlData()?.provideTags().find(({name: n}) => n === token.name);
			if (data?.description) {
				const start = positionAt(root, token.getAbsoluteIndex());
				return {
					contents: data.description,
					range: {
						start,
						end: {
							line: start.line,
							character: start.character + token.getRelativeIndex(0),
						},
					},
				};
			}
		} else if (type === 'attr-key' && isHtmlAttr(parentNode!)) {
			const data = loadHtmlData()?.provideAttributes(parentNode.tag).find(({name: n}) => n === parentNode.name);
			if (data?.description) {
				return {
					contents: data.description,
					range: createNodeRange(offsetNode),
				};
			}
		}

		/* NOT FOR BROWSER ONLY END */

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
	 * @since v1.24.1
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
		const {
			viewOnly,

			/* PRINT ONLY */

			internal,
		} = Parser;
		Parser.viewOnly = false;

		/* PRINT ONLY */

		Parser.internal = true;

		/* PRINT ONLY END */

		root.escape();
		Parser.viewOnly = viewOnly;

		/* PRINT ONLY */

		Parser.internal = internal;

		/* PRINT ONLY END */

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

	/* NOT FOR BROWSER ONLY */

	/**
	 * Provide quick fixes
	 *
	 * 提供快速修复建议
	 * @param diagnostics grammar diagnostics / 语法诊断信息
	 */
	provideCodeAction(diagnostics: DiagnosticBase[]): CodeAction[] {
		const actionable = diagnostics.filter((diagnostic): diagnostic is Diagnostic => diagnostic.data),
			fixable = actionable.filter(({source, data}) => source === 'WikiLint' && data.some(({fix}) => fix)),
			fixableRules = [...new Set(fixable.map(({code}) => code as string))];
		return [
			...actionable.flatMap(
				diagnostic => diagnostic.data.map((data): CodeAction => ({
					title: data.title,
					kind: 'quickfix',
					diagnostics: [diagnostic],
					isPreferred: data.fix,
					edit: {
						changes: {'': [data]},
					},
				})),
			),
			...fixable.length === 0
				? []
				: [
					...fixableRules.map((rule): CodeAction => ({
						title: `Fix all: ${rule}`,
						kind: 'source.fixAll',
						diagnostics: fixable.filter(({code}) => code === rule),
						isPreferred: true,
						data: {rule},
					})),
					{
						title: 'Fix all: WikiLint',
						kind: 'source.fixAll',
						diagnostics: fixable,
						isPreferred: true,
						data: {},
					},
				],
		];
	}

	/**
	 * Provide document sections
	 *
	 * 提供章节
	 * @param text source Wikitext / 源代码
	 */
	async provideDocumentSymbols(text: string): Promise<DocumentSymbol[]> {
		const root = await this.#queue(text),
			lines = root.getLines(),
			{length} = lines,
			symbols: DocumentSymbol[] = [],
			names = new Set<string>(),
			sections = new Array<DocumentSymbol | undefined>(6),
			tokens = root.querySelectorAll<Token>('heading-title');
		for (const token of tokens) {
			const {top, height, left, width} = token.getBoundingClientRect(),
				{level} = token.parentNode as HeadingToken;
			for (let i = level - 1; i < 6; i++) {
				getSectionEnd(sections[i], lines, top - 1);
				sections[i] = undefined;
			}
			const section = token.text().trim() || ' ',
				name = names.has(section)
					? Array.from({length: names.size}, (_, i) => `${section.trim()}_${i + 2}`)
						.find(s => !names.has(s))!
					: section,
				container = sections.slice(0, level - 1).reverse().find(symbol => symbol !== undefined),
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
		}
		for (const section of sections) {
			getSectionEnd(section, lines, length - 1);
		}
		return symbols;
	}

	/**
	 * Set the target Wikipedia
	 *
	 * 设置目标维基百科
	 * @param wiki Wikipedia URL / 维基百科网址
	 * @param user URI for wiki userpage or email address of the user / 维基用户页面地址或用户的电子邮件地址
	 * @since v1.18.1
	 */
	async setTargetWikipedia(wiki: string, user: string): Promise<void> {
		const [site, host] = Parser.getWMFSite(wiki);
		try {
			const config: ConfigData = require(path.join('..', '..', 'config', site));
			this.config = Parser.getConfig(config);
		} catch {
			this.config = await Parser.fetchConfig(site, `${host}/w`, user);
		}
		Object.assign(this.config, {articlePath: `${host}/wiki/`});
	}
}
