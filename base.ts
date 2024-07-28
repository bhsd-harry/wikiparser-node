interface CommonConfig {
	ext: string[];
	readonly html: [string[], string[], string[]];
	readonly namespaces: Record<string, string>;
	readonly nsid: Record<string, number>;
	readonly parserFunction: [Record<string, string>, string[], string[], string[]];
	readonly protocol: string;
	readonly img: Record<string, string>;
	readonly redirection: string[];
	readonly variants: string[];
	readonly excludes?: string[];

	/* NOT FOR BROWSER */

	readonly interwiki: string[];
	readonly conversionTable?: [string, string][];
	readonly redirects?: [string, string][];
	readonly articlePath?: string;
}

export interface JsonConfig extends CommonConfig {
	readonly doubleUnderscore: [Record<string, string> | string[], string[]];
}

export interface Config extends CommonConfig {
	readonly doubleUnderscore: [string[], string[], Record<string, string>];
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

export const rules = [
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
Object.freeze(rules);

export namespace LintError {
	export type Severity = 'error' | 'warning';

	export type Rule = typeof rules[number];

	export interface Fix {
		readonly range: [number, number];
		text: string;
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
	suggestions?: (LintError.Fix & {desc: string})[];
}

export type AST = Record<string, string | number | boolean> & {
	range: [number, number];
	type?: TokenTypes;
	childNodes?: AST[];
};

/** 类似Node */
export interface AstNode {
	readonly childNodes: readonly AstNode[];

	/** 节点类型 */
	type: string;

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

export interface Parser {
	config: Config | string;
	i18n: Record<string, string>
	| string
	| undefined;

	/** 获取当前的解析设置 */
	getConfig(): Config;

	/**
	 * 解析wikitext
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): Token;
}
