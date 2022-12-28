'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	NowikiToken = require('.');

/**
 * :
 * @classdesc `{childNodes: [string]}`
 */
class DdToken extends NowikiToken {
	type = 'dd';
	dt = false;
	ul = false;
	ol = false;
	indent = 0;

	/** @param {string} str */
	#update(str) {
		this.setAttribute('ul', str.includes('*')).setAttribute('ol', str.includes('#'))
			.setAttribute('dt', str.includes(';')).setAttribute('indent', str.split(':').length - 1);
	}

	/**
	 * @param {string} str
	 * @param {accum} accum
	 */
	constructor(str, config = Parser.getConfig(), accum = []) {
		super(str, config, accum);
		this.seal(['dt', 'ul', 'ol', 'indent']).#update(str);
	}

	/** @param {string} str */
	setText(str) {
		const src = this.type === 'dd' ? ':' : ';:*#';
		if (RegExp(`[^${src}]`).test(str)) {
			throw new RangeError(`${this.constructor.name} 仅能包含${src.split('').map(c => `"${c}"`).join('、')}！`);
		}
		this.#update(str);
		return super.setText(str);
	}
}

Parser.classes.DdToken = __filename;
module.exports = DdToken;
