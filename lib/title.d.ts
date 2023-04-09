/** MediaWiki页面标题对象 */
declare class Title {
	/**
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	constructor(title: string, defaultNs?: number, config?: import('..').ParserConfig, decode?: boolean, selfLink?: boolean);
	valid: boolean;
	ns: number;
	fragment: string;
	encoded: boolean;
	title: string;
	main: string;
	prefix: string;
	interwiki: string;

	/** 完整链接 */
	toString(): string;
}

export = Title;
