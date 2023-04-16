'use strict';

const hidden = require('../../mixin/hidden'),
	NowikiToken = require('.');

/**
 * 状态开关
 * @classdesc `{childNodes: [AstText]}`
 */
class DoubleUnderscoreToken extends hidden(NowikiToken) {
	/** @type {'double-underscore'} */ type = 'double-underscore';

	/** @override */
	getPadding() {
		return 2;
	}

	/**
	 * @override
	 */
	toString(selector) {
		return `__${String(this.firstChild)}__`;
	}
}

module.exports = DoubleUnderscoreToken;
