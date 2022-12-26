'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	Token = require('..'),
	FileToken = require('./file');

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class GalleryImageToken extends FileToken {
	type = 'gallery-image';

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		let token;
		if (text !== undefined) {
			token = new Token(text, config, true, accum);
			token.type = 'temp';
			token.setAttribute('stage', 1);
			for (let n = 1; n < Parser.MAX_STAGE; n++) {
				token.parseOnce();
			}
			accum.splice(accum.indexOf(token), 1);
		}
		const newConfig = structuredClone(config);
		newConfig.img = Object.fromEntries(Object.entries(config.img).filter(([, param]) => param !== 'width'));
		super(link, token?.toString(), title, newConfig, accum);
	}
}

module.exports = GalleryImageToken;
