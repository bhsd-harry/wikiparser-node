export interface Config {
	ext: string[];
	html: [string[], string[], string[]];
	namespaces: Record<string, string>;
	nsid: Record<string, number>;
	parserFunction: [Record<string, string>, string[], string[], string[]];
	doubleUnderscore: [string[], string[]];
	protocol: string;
	img: Record<string, string>;
	variants: string[];
	excludes?: string[];
	inExt?: boolean;
}

export interface LintError {
	message: string;
	severity: 'error' | 'warning';
	startIndex: number;
	endIndex: number;
	startLine: number;
	startCol: number;
	endLine: number;
	endCol: number;
}

/** 类似Node */
export abstract class AstNode {
	type: string;
	childNodes: AstNode[];

	/** Linter */
	lint(): LintError[];

	/** 以HTML格式打印 */
	print(): string;
}

export interface Parser {
	config?: Config;
	i18n: Record<string, string> | undefined;

	/** @private */
	getConfig(): Config;

	/**
	 * 解析wikitext
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): AstNode;
}
