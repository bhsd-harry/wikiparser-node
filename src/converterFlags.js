'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
class ConverterFlagsToken extends Token {
	type = 'converter-flags';

	/**
	 * @param {string[]} flags
	 * @param {accum} accum
	 */
	constructor(flags, config = Parser.getConfig(), accum = []) {
		super(undefined, config, false, accum);
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	toString() {
		return super.toString(';');
	}

	print() {
		return super.print({sep: ';'});
	}

	text() {
		return super.text(';');
	}
}

module.exports = ConverterFlagsToken;
