export interface Config {
	ext: string[];
	readonly html: [string[], string[], string[]];
	readonly namespaces: Record<string, string>;
	readonly nsid: Record<string, number>;
	readonly parserFunction: [Record<string, string>, string[], string[], string[]];
	readonly doubleUnderscore: [string[], string[]];
	readonly protocol: string;
	readonly img: Record<string, string>;
	readonly variants: string[];
	readonly excludes?: string[];
	inExt?: boolean;
}

export namespace LintError {
	export type Severity = 'error' | 'warning';

	export type Rule = 'bold-header'
		| 'format-leakage'
		| 'fostered-content'
		| 'h1'
		| 'illegal-attr'
		| 'insecure-style'
		| 'invalid-gallery'
		| 'invalid-imagemap'
		| 'invalid-invoke'
		| 'lonely-apos'
		| 'lonely-bracket'
		| 'lonely-http'
		| 'nested-link'
		| 'no-arg'
		| 'no-duplicate'
		| 'no-ignored'
		| 'obsolete-attr'
		| 'obsolete-tag'
		| 'parsing-order'
		| 'pipe-like'
		| 'table-layout'
		| 'tag-like'
		| 'unbalanced-header'
		| 'unclosed-comment'
		| 'unclosed-quote'
		| 'unclosed-table'
		| 'unescaped'
		| 'unknown-page'
		| 'unmatched-tag'
		| 'unterminated-url'
		| 'url-encoding'
		| 'var-anchor'
		| 'void-ext';

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
	type?: string;
	childNodes?: AST[];
};

/** 类似Node */
export interface AstNode {
	type: string;
	readonly childNodes: readonly AstNode[];

	/** Linter */
	lint(): LintError[];

	/** 以HTML格式打印 */
	print(): string;
}

/** 类似HTMLElement */
interface AstElement extends AstNode {

	/** 保存为JSON */
	json(): AST;
}

export interface Parser {
	config?: Config;
	i18n: Record<string, string> | undefined;

	/** 获取解析设置 */
	getConfig(): Config;

	/**
	 * 解析wikitext
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): AstElement;
}
