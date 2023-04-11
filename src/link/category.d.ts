import LinkToken = require('.');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
declare class CategoryToken extends LinkToken {
	override type: 'category';

	/** 分类排序关键字 */
	get sortkey(): string;
	set sortkey(arg: string);

	/**
	 * 设置排序关键字
	 * @param text 排序关键字
	 */
	setSortkey(text: string): void;
}

export = CategoryToken;
