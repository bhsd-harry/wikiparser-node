'use strict';

const Parser = require('../..'),
	FileToken = require('./file');

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class GalleryImageToken extends FileToken {
	type = 'gallery-image';

	/**
	 * @param {string} link 图片文件名
	 * @param {string|undefined} text 图片参数
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		let token;
		if (text !== undefined) {
			const Token = require('..');
			token = new Token(text, config, true, accum);
			token.type = 'temp';
			for (let n = 1; n < Parser.MAX_STAGE; n++) {
				token.getAttribute('parseOnce')();
			}
			accum.splice(accum.indexOf(token), 1);
		}
		super(link, token?.toString(), title, config, accum);
		this.setAttribute('bracket', false);
	}

	/** @override */
	getPadding() {
		return 0;
	}
}

module.exports = GalleryImageToken;
