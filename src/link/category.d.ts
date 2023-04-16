import LinkToken = require('.');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
declare class CategoryToken extends LinkToken {
	override type: 'category';
}

export = CategoryToken;
