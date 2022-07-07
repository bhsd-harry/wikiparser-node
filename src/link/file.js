'use strict';

const {explode} = require('../../util/string'),
	/** @type {Parser} */ Parser = require('../..'),
	LinkToken = require('.'),
	ImageParameterToken = require('../imageParameter');

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class FileToken extends LinkToken {
	type = 'file';

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {Title} title
	 * @param {accum} accum
	 * @complexity `n`
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, undefined, title, config, accum);
		this.append(...explode('-{', '}-', '|', text).map(part => new ImageParameterToken(part, config, accum)));
	}
}

module.exports = FileToken;
