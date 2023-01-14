'use strict';

const hidden = require('../../mixin/hidden'),
	NowikiToken = require('.');

/**
 * 状态开关
 * @classdesc `{childNodes: [AstText]}`
 */
class DoubleUnderscoreToken extends hidden(NowikiToken) {
	type = 'double-underscore';

	/** @override */
	toString() {
		return `__${String(this.firstChild)}__`;
	}

	/** @override */
	getPadding() {
		return 2;
	}

	/** @override */
	print() {
		return super.print({pre: '__', post: '__'});
	}
}

module.exports = DoubleUnderscoreToken;
