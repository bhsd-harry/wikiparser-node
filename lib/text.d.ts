import AstNode = require('./node');

/** 文本节点 */
declare class AstText extends AstNode {
	/** @param text 包含文本 */
	constructor(text?: string);
	override type: 'text';
	data: string;

	/** @override */
	override text(): string;

	/**
	 * 替换字符串
	 * @param text 替换的字符串
	 */
	replaceData(text?: string): void;
}

export = AstText;
