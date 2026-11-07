export interface Config {
	ext: string[];
	readonly html: [string[], string[], string[]];
	readonly namespaces: Record<number, string>;
	readonly nsid: Record<string, number>;
	readonly parserFunction: [Record<string, string>, Record<string, string>, string[], string[]];
	readonly doubleUnderscore: [string[], string[], Record<string, string>, Record<string, string>];
	readonly protocol: string;
	readonly img: Record<string, string>;
	readonly redirection: string[];
	variable: string[];
	functionHook: string[];
	capitalLinks?: boolean;
	variants: string[];
	articlePath?: string;

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

	/* NOT FOR BROWSER */

	readonly conversionTable?: [string, string][];
	readonly redirects?: [string, string][];
	readonly interwiki: string[];
	server?: string;
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
	| 'image-parameter'
	| 'quote'
	| 'ext-link'
	| 'ext-link-text'
	| 'ext-link-url'
	| 'free-ext-link'
	| 'magic-link'
	| 'list'
	| 'dd'
	| 'converter'
	| 'converter-flags'
	| 'converter-flag'
	| 'converter-rule'
	| 'converter-rule-variant'
	| 'converter-rule-to'
	| 'converter-rule-from'
	| 'param-line'
	| 'param-line-key'
	| 'param-line-value'
	| 'list-range';

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

	/* NOT FOR BROWSER */

	/**
	 * Generate HTML
	 *
	 * 生成HTML
	 * @since v1.10.0
	 */
	toHtml(opt?: RenderOpt): string;
}

export interface Parser {
	config:
	ConfigData;
	i18n: Record<string, string>
		| string
		| undefined;

	/** @since v1.9.0 */
	viewOnly: boolean;

	/**
	 * Get the current parser configuration
	 *
	 * 获取当前的解析设置
	 * @param config unprocessed parser configuration / 未处理的解析设置
	 * @throws `RangeError` if the configuration file path or file name is invalid
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
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config, page?: string): Token;
	parse(wikitext: string, page: string, include?: boolean, maxStage?: number, config?: Config): Token;
}

/* NOT FOR BROWSER */

export interface RenderOpt {
	toc?: boolean;
	cats?: boolean;
	redirect?: boolean;
	indicators?: boolean;
}
