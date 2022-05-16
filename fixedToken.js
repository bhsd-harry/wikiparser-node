'use strict';
const Token = require('./token'),
	{externalUse} = require('./util');

class FixedToken extends Token {
	seal() {
		if (externalUse()) {
			throw new Error('禁止外部调用FixedToken.seal方法！');
		}
		return this.keepChildrenOrder().unremovableChild(':');
	}

	insert() {
		throw new Error(`${this.constructor.name}不可插入元素！`);
	}

	delete() {
		throw new Error(`${this.constructor.name}不可删除元素！`);
	}
}

Token.classes.FixedToken = FixedToken;

module.exports = FixedToken;
