import AstNode = require('./node');

/** 文本节点 */
declare class AstText extends AstNode {
	/** @param text 包含文本 */
	constructor(text?: string);
	override type: 'text';
	data: string;

	/** 文本长度 */
	get length(): number;
	/** @override */
	override text(): string;

	/**
	 * 替换字符串
	 * @param text 替换的字符串
	 */
	replaceData(text?: string): void;

	/**
	 * 在后方添加字符串
	 * @param text 添加的字符串
	 */
	appendData(text: string): void;

	/**
	 * 删减字符串
	 * @param offset 起始位置
	 * @param count 删减字符数
	 */
	deleteData(offset: number, count: number): void;

	/**
	 * 插入字符串
	 * @param offset 插入位置
	 * @param text 待插入的字符串
	 */
	insertData(offset: number, text: string): void;

	/**
	 * 提取子串
	 * @param offset 起始位置
	 * @param count 字符数
	 */
	substringData(offset: number, count: number): string;

	/**
	 * 将文本子节点分裂为两部分
	 * @param offset 分裂位置
	 * @throws `RangeError` 错误的断开位置
	 * @throws `Error` 没有父节点
	 */
	splitText(offset: number): AstText;
}

export = AstText;
