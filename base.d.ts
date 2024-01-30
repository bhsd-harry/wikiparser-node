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

export type Severity = 'error' | 'warning';

export interface LintError {
	readonly message: string;
	readonly severity: Severity;
	readonly startIndex: number;
	readonly endIndex: number;
	readonly startLine: number;
	readonly startCol: number;
	readonly endLine: number;
	readonly endCol: number;
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
