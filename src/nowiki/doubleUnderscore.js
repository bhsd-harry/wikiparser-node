'use strict';

const NowikiToken = require('.');

/**
 * 状态开关
 * @classdesc `{childNodes: [string]}`
 */
class DoubleUnderscoreToken extends NowikiToken {
	type = 'double-underscore';

	/** @this {DoubleUnderscoreToken & {firstChild: string}} */
	toString() {
		return `__${this.firstChild}__`;
	}

	print() {
		return super.print({pre: '__', post: '__'});
	}
}

module.exports = DoubleUnderscoreToken;
