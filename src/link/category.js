'use strict';

const LinkToken = require('.');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class CategoryToken extends LinkToken {
	/** @type {'category'} */ type = 'category';
}

module.exports = CategoryToken;
