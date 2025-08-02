export interface Config {
	ext: string[];
	readonly namespaces: Record<string, string>;
	readonly nsid: Record<string, number>;
	readonly variable: string[];
	readonly functionHook: string[];
	readonly parserFunction: [Record<string, string>, Record<string, string>, string[], string[]];

	/** @private */
	readonly excludes: string[];
}
export type ConfigData = Omit<Config, 'excludes'>;

export type TokenTypes = 'root'
	| 'plain'
	| 'onlyinclude'
	| 'noinclude'
	| 'include'
	| 'comment'
	| 'ext'
	| 'ext-attrs'
	| 'ext-attr'
	| 'attr-value'
	| 'ext-inner'
	| 'arg'
	| 'arg-name'
	| 'arg-default'
	| 'hidden'
	| 'magic-word'
	| 'magic-word-name'
	| 'template'
	| 'template-name'
	| 'parameter'
	| 'parameter-key'
	| 'parameter-value'
	| 'heading'
	| 'heading-title'
	| 'heading-trail'
	| 'gallery-image'
	| 'imagemap-image'
	| 'image-parameter';

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

	/**
	 * Get all descendants that match the selector
	 *
	 * 符合选择器的所有后代节点
	 * @param selector selector / 选择器
	 */
	querySelectorAll<T = Token>(selector: string): T[];
}

export interface Parser {
	config?: Partial<ConfigData>;

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
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): Token;
}
