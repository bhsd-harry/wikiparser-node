import type {
	Range,
	Position,
	ColorInformation,
	ColorPresentation,
	CompletionItem as CompletionItemBase,
	CompletionItemKind,
	FoldingRange,
	DocumentLink,
	Location,
	WorkspaceEdit,
	Diagnostic,
	Hover,
	SignatureHelp,
	InlayHint,
	CodeAction,
} from 'vscode-languageserver-types';

export interface Config {
	ext: string[];
	readonly html: [string[], string[], string[]];
	readonly namespaces: Record<string, string>;
	readonly nsid: Record<string, number>;
	readonly variable: string[];
	readonly functionHook: string[];
	readonly parserFunction: [Record<string, string>, Record<string, string> | string[], string[], string[]];
	readonly doubleUnderscore: [string[], string[], Record<string, string>?, Record<string, string>?];
	readonly protocol: string;
	readonly interwiki: string[];
	readonly img: Record<string, string>;
	readonly redirection: string[];
	readonly variants: string[];
	readonly articlePath?: string;

	/** @private */
	readonly excludes: string[];
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
export type ConfigData = Omit<Config, 'excludes'>;

export type TokenTypes = 'root'
	| 'plain'
	| 'redirect'
	| 'redirect-syntax'
	| 'redirect-target'
	| 'translate'
	| 'translate-attr'
	| 'translate-inner'
	| 'tvar'
	| 'tvar-name'
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
		'list-range': 11,
	} satisfies Partial<Record<TokenTypes, number>>;
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
		'invalid-url',
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

/* PRINT ONLY */

export type AST = Record<string, string | number | boolean> & {
	range: [number, number];
	type?: TokenTypes;
	name?: string;
	childNodes?: AST[];
	data?: string;
};

/* PRINT ONLY END */

/**
 * Node-like
 *
 * 类似Node
 */
export interface AstNode {
	readonly childNodes: readonly AstNode[];

	/**
	 * node type
	 *
	 * 节点类型
	 */
	type: string;

	toString(...args: unknown[]): string;

	/** @private */
	getAttribute(key: string): unknown;

	/** Linter */
	lint(): LintError[];

	/**
	 * print in HTML
	 *
	 * 以HTML格式打印
	 */
	print(): string;
}

/**
 * base class for all tokens
 *
 * 所有节点的基类
 */
interface Token extends AstNode {
	readonly name?: string;

	/**
	 * Get all descendants that match the selector
	 *
	 * 符合选择器的所有后代节点
	 * @param selector selector / 选择器
	 */
	querySelectorAll<T = Token>(selector: string): T[];

	/**
	 * Save in JSON format
	 *
	 * 保存为JSON
	 */
	json(): AST;
}

interface SignatureParameter {
	label: string;
	const?: boolean;
	rest?: boolean;
}
export interface SignatureInfo {
	aliases: string[];
	description: string;
	signatures?: SignatureParameter[][];
}
export interface SignatureData {
	behaviorSwitches: SignatureInfo[];
	parserFunctions: SignatureInfo[];
}

export type CompletionItem = Omit<CompletionItemBase, 'kind'> & {
	kind?: CompletionItemKind | keyof typeof CompletionItemKind;
};

export interface LanguageService {
	include: boolean;
	/** @private */
	data?: SignatureData;

	/**
	 * Destroy the instance
	 *
	 * 销毁实例
	 */
	destroy(): void;

	/**
	 * Provide color decorators
	 *
	 * 提供颜色指示
	 * @param rgba color parser / 颜色解析函数
	 * @param text source Wikitext / 源代码
	 * @param hsl whether HSL colors are treated / 是否允许HSL颜色
	 */
	provideDocumentColors(
		rgba: (s: string) => [number, number, number, number] | [],
		text: string,
		hsl?: boolean,
	): Promise<ColorInformation[]>;

	/**
	 * Provide color pickers
	 *
	 * 颜色选择器
	 * @param color color information / 颜色信息
	 */
	provideColorPresentations(color: ColorInformation): ColorPresentation[];

	/**
	 * Provide auto-completion
	 *
	 * 提供自动补全
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	provideCompletionItems(text: string, position: Position): Promise<CompletionItem[] | undefined>;

	/**
	 * Provide grammar check
	 *
	 * 提供语法检查
	 * @param text source Wikitext / 源代码
	 * @param warning whether to include warnings / 是否包含警告
	 */
	provideDiagnostics(text: string, warning?: boolean): Promise<Diagnostic[]>;

	/**
	 * Resolve fix-all code action
	 *
	 * 实现修复全部代码的操作
	 * @param action code action / 代码操作
	 */
	resolveCodeAction(action: CodeAction): CodeAction;

	/**
	 * Provide folding ranges
	 *
	 * 提供折叠范围
	 * @param text source Wikitext / 源代码
	 */
	provideFoldingRanges(text: string): Promise<FoldingRange[]>;

	/**
	 * Provide links
	 *
	 * 提供链接
	 * @param text source Wikitext / 源代码
	 */
	provideLinks(text: string): Promise<DocumentLink[]>;

	/**
	 * Provide references
	 *
	 * 提供引用
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	provideReferences(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined>;

	/**
	 * Provide definitions
	 *
	 * 提供定义
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	provideDefinition(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined>;

	/**
	 * Provide locations for renaming
	 *
	 * 提供变量更名准备
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	resolveRenameLocation(text: string, position: Position): Promise<Range | undefined>;

	/**
	 * Provide rename edits
	 *
	 * 变量更名
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 * @param newName new name / 新名称
	 */
	provideRenameEdits(text: string, position: Position, newName: string): Promise<WorkspaceEdit | undefined>;

	/**
	 * Provide hover information
	 *
	 * 提供悬停信息
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	provideHover(text: string, position: Position): Promise<Hover | undefined>;

	/**
	 * Provide signature help for magic words
	 *
	 * 提供魔术字帮助
	 * @param text source Wikitext / 源代码
	 * @param position position / 位置
	 */
	provideSignatureHelp(text: string, position: Position): Promise<SignatureHelp | undefined>;

	/**
	 * Provide CodeLens
	 *
	 * 提供 CodeLens
	 * @param text source Wikitext / 源代码
	 */
	provideInlayHints(text: string): Promise<InlayHint[]>;

	/**
	 * Provide refactoring actions
	 *
	 * 提供重构操作
	 * @param text source Wikitext / 源代码
	 * @param range range of the refactoring / 重构范围
	 */
	provideRefactoringAction(text: string, range?: Range): Promise<CodeAction[]>;

	/** @private */
	findStyleTokens(): Token[];
}

export type SeverityLevel = 0 | 1 | 2 | false | 'off' | 'warning' | 'error';
export type LintConfigValue = SeverityLevel | [SeverityLevel, Record<string, SeverityLevel>?];
export type LintRuleConfig = Partial<Record<LintError.Rule, LintConfigValue>>;
export interface FullLintConfig {
	rules: LintRuleConfig;
	configurationComment?: string;
	ignoreDisables?: boolean;
	fix?: boolean;
	computeEditInfo?: boolean;
}
export type LintConfig = LintRuleConfig | FullLintConfig;
export interface LintRuleConfiguration extends LintRuleConfig {
	getSeverity(rule: LintError.Rule, key?: string): LintError.Severity | false;
}
export interface LintConfiguration extends FullLintConfig {
	rules: LintRuleConfiguration;
	getSeverity(rule: LintError.Rule, key?: string): LintError.Severity | false;
}

export interface Parser {
	config: ConfigData;
	i18n: Record<string, string>
		| undefined;

	/** @since v1.22.0 */
	lintConfig: LintConfig;

	/** @since v1.9.0 */
	viewOnly: boolean;

	/**
	 * Get the current parser configuration
	 *
	 * 获取当前的解析设置
	 * @param config unprocessed parser configuration / 未处理的解析设置
	 */
	getConfig(config?: ConfigData): Config;

	/**
	 * Parse wikitext
	 *
	 * 解析wikitext
	 * @param include whether to be transcluded / 是否嵌入
	 * @param maxStage max stage for parsing / 最大解析层级
	 * @param page page name / 页面名称
	 */
	parse(
		wikitext: string,
		include?: boolean,
		maxStage?: number | Stage | Stage[],
		config?: Config,
		page?: string,
	): Token;

	/**
	 * Create a language server
	 *
	 * 创建语言服务
	 * @param uri document URI / 文档标识
	 * @since v1.16.1
	 */
	createLanguageService(uri?: object): LanguageService;
}
