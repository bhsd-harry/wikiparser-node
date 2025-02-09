import type {
	Range,
	Position,
	ColorInformation,
	ColorPresentation,
	CompletionItem as CompletionItemBase,
	CompletionItemKind,
	FoldingRange,
	DocumentSymbol,
	DocumentLink,
	Location,
	WorkspaceEdit,
} from 'vscode-languageserver-types';

export interface Config {
	ext: string[];
	readonly html: [string[], string[], string[]];
	readonly namespaces: Record<string, string>;
	readonly nsid: Record<string, number>;
	readonly variable: string[];
	readonly parserFunction: [Record<string, string>, Record<string, string> | string[], string[], string[]];
	readonly doubleUnderscore: [string[], string[], Record<string, string>?, Record<string, string>?];
	readonly protocol: string;
	readonly interwiki: string[];
	readonly img: Record<string, string>;
	readonly redirection: string[];
	readonly variants: string[];
	readonly articlePath?: string;

	/** @private */
	readonly excludes?: string[];
	/** @private */
	inExt?: boolean;
	/** @private */
	regexRedirect?: RegExp;
	/** @private */
	regexHrAndDoubleUnderscore?: RegExp;
	/** @private */
	regexLinks?: RegExp;
	/** @private */
	regexExternalLinks?: RegExp;
	/** @private */
	regexMagicLinks?: RegExp;
	/** @private */
	regexConverter?: RegExp;
	/** @private */
	insensitiveDoubleUnderscore?: Set<string>;
	/** @private */
	sensitiveDoubleUnderscore?: Set<string>;
	/** @private */
	htmlElements?: Set<string>;
}

export type TokenTypes = 'root'
	| 'plain'
	| 'redirect'
	| 'redirect-syntax'
	| 'redirect-target'
	| 'onlyinclude'
	| 'noinclude'
	| 'include'
	| 'comment'
	| 'ext'
	| 'ext-attrs'
	| 'ext-attr-dirty'
	| 'ext-attr'
	| 'attr-key'
	| 'attr-value'
	| 'ext-inner'
	| 'arg'
	| 'arg-name'
	| 'arg-default'
	| 'hidden'
	| 'magic-word'
	| 'magic-word-name'
	| 'invoke-function'
	| 'invoke-module'
	| 'template'
	| 'template-name'
	| 'parameter'
	| 'parameter-key'
	| 'parameter-value'
	| 'heading'
	| 'heading-title'
	| 'heading-trail'
	| 'html'
	| 'html-attrs'
	| 'html-attr-dirty'
	| 'html-attr'
	| 'table'
	| 'tr'
	| 'td'
	| 'table-syntax'
	| 'table-attrs'
	| 'table-attr-dirty'
	| 'table-attr'
	| 'table-inter'
	| 'td-inner'
	| 'hr'
	| 'double-underscore'
	| 'link'
	| 'link-target'
	| 'link-text'
	| 'category'
	| 'file'
	| 'gallery-image'
	| 'imagemap-image'
	| 'image-parameter'
	| 'quote'
	| 'ext-link'
	| 'ext-link-text'
	| 'ext-link-url'
	| 'free-ext-link'
	| 'magic-link'
	| 'list'
	| 'dd'
	| 'list-range'
	| 'converter'
	| 'converter-flags'
	| 'converter-flag'
	| 'converter-rule'
	| 'converter-rule-variant'
	| 'converter-rule-to'
	| 'converter-rule-from'
	| 'param-line'
	| 'imagemap-link';

export const stages = /* #__PURE__ */ (() => {
	const obj = {
		redirect: 1,
		onlyinclude: 1,
		noinclude: 1,
		include: 1,
		comment: 1,
		ext: 1,
		arg: 2,
		'magic-word': 2,
		template: 2,
		heading: 2,
		html: 3,
		table: 4,
		hr: 5,
		'double-underscore': 5,
		link: 6,
		category: 6,
		file: 6,
		quote: 7,
		'ext-link': 8,
		'free-ext-link': 9,
		'magic-link': 9,
		list: 10,
		dd: 10,
		converter: 11,
	};
	Object.setPrototypeOf(obj, null);
	return obj;
})();

export type Stage = keyof typeof stages;

export const rules = /* #__PURE__ */ (() => {
	const arr = [
		'bold-header',
		'format-leakage',
		'fostered-content',
		'h1',
		'illegal-attr',
		'insecure-style',
		'invalid-gallery',
		'invalid-imagemap',
		'invalid-invoke',
		'invalid-isbn',
		'lonely-apos',
		'lonely-bracket',
		'lonely-http',
		'nested-link',
		'no-arg',
		'no-duplicate',
		'no-ignored',
		'obsolete-attr',
		'obsolete-tag',
		'parsing-order',
		'pipe-like',
		'table-layout',
		'tag-like',
		'unbalanced-header',
		'unclosed-comment',
		'unclosed-quote',
		'unclosed-table',
		'unescaped',
		'unknown-page',
		'unmatched-tag',
		'unterminated-url',
		'url-encoding',
		'var-anchor',
		'void-ext',
	] as const;
	Object.freeze(arr);
	return arr;
})();

export namespace LintError {
	export type Severity = 'error' | 'warning';

	export type Rule = typeof rules[number];

	export interface Fix {
		readonly range: [number, number];
		text: string;
		desc: string;
	}
}

export interface LintError {
	rule: LintError.Rule;
	message: string;
	severity: LintError.Severity;
	startIndex: number;
	endIndex: number;
	startLine: number;
	startCol: number;
	endLine: number;
	endCol: number;
	fix?: LintError.Fix;
	suggestions?: LintError.Fix[];
}

export type AST = Record<string, string | number | boolean> & {
	range: [number, number];
	type?: TokenTypes;
	name?: string;
	childNodes?: AST[];
	data?: string;
};

/** 类似Node */
export interface AstNode {
	readonly childNodes: readonly AstNode[];

	/** 节点类型 */
	type: string;

	toString(...args: unknown[]): string;

	/** @private */
	getAttribute(key: string): unknown;

	/** Linter */
	lint(): LintError[];

	/** 以HTML格式打印 */
	print(): string;
}

/** 所有节点的基类 */
interface Token extends AstNode {
	readonly name?: string;

	/**
	 * 符合选择器的所有后代节点
	 * @param selector 选择器
	 */
	querySelectorAll<T = Token>(selector: string): T[];

	/** 保存为JSON */
	json(): AST;
}

export type CompletionItem = Omit<CompletionItemBase, 'kind'> & {kind: keyof typeof CompletionItemKind};

export interface LanguageService {

	/**
	 * 提供颜色指示
	 * @param rgba 颜色解析函数
	 * @param text 源代码
	 * @param hsl 是否允许HSL颜色
	 */
	provideDocumentColors(
		rgba: (s: string) => [number, number, number, number] | [],
		text: string,
		hsl?: boolean,
	): Promise<ColorInformation[]>;

	/**
	 * 颜色选择器
	 * @ignore
	 */
	provideColorPresentations(// eslint-disable-line @typescript-eslint/class-methods-use-this
		{color: {red, green, blue, alpha}, range}: ColorInformation): ColorPresentation[];

	/**
	 * 提供自动补全
	 * @param text 源代码
	 * @param position 位置
	 */
	provideCompletionItems(text: string, position: Position): Promise<CompletionItem[] | undefined>;

	/**
	 * 提供折叠范围
	 * @param text 源代码
	 */
	provideFoldingRanges(text: string): Promise<FoldingRange[]>;

	/**
	 * 提供章节
	 * @param text 源代码
	 */
	provideDocumentSymbols(text: string): Promise<DocumentSymbol[]>;

	/**
	 * 提供链接
	 * @param text 源代码
	 */
	provideLinks(text: string): Promise<DocumentLink[]>;

	/**
	 * 提供引用
	 * @param text 源代码
	 * @param position 位置
	 */
	provideReferences(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined>;

	/**
	 * 提供定义
	 * @param text 源代码
	 * @param position 位置
	 */
	provideDefinition(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined>;

	/**
	 * 提供变量更名准备
	 * @param text 源代码
	 * @param position 位置
	 */
	resolveRenameLocation(text: string, position: Position): Promise<Range | undefined>;

	/**
	 * 变量更名
	 * @param text 源代码
	 * @param position 位置
	 * @param newName 新名称
	 */
	provideRenameEdits(text: string, position: Position, newName: string): Promise<WorkspaceEdit | undefined>;
}

export interface Parser {
	config: Config;
	i18n: Record<string, string>
		| undefined;

	/** 获取当前的解析设置 */
	getConfig(): Config;

	/**
	 * 解析wikitext
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number | Stage | Stage[], config?: Config): Token;

	/**
	 * 创建语言服务
	 * @param uri 文档标识
	 */
	createLanguageService(uri: object): LanguageService;
}
