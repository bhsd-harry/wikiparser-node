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
}

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

export interface LintError {
	readonly rule: Rule;
	readonly message: string;
	readonly severity: Severity;
	readonly startIndex: number;
	readonly endIndex: number;
	readonly startLine: number;
	readonly startCol: number;
	readonly endLine: number;
	readonly endCol: number;
}

/** 类似Node */
export interface AstNode {
	type: string;
	readonly childNodes: readonly AstNode[];

	/** Linter */
	lint(): LintError[];
}

/** 类似HTMLElement */
interface AstElement extends AstNode {
}

export interface Parser {
	config: string | Config;
	i18n: string | Record<string, string> | undefined;

	/** 获取解析设置 */
	getConfig(): Config;

	/**
	 * 解析wikitext
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): AstElement;
}
