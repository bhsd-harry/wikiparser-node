'use strict';

const Parser = require('../..'),
	Token = require('..'),
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
	constructor(link, text, config = Parser.getConfig(), accum = []) {
		let token;
		if (text !== undefined) {
			token = new Token(text, config, true, accum);
			token.type = 'temp';
			for (let n = 1; n < Parser.MAX_STAGE; n++) {
				token.getAttribute('parseOnce')();
			}
			accum.splice(accum.indexOf(token), 1);
		}
		const newConfig = JSON.parse(JSON.stringify(config));
		newConfig.img = Object.fromEntries(Object.entries(config.img).filter(([, param]) => param !== 'width'));
		super(link, token?.toString(), newConfig, accum);
	}

	/** @override */
	getPadding() {
		return 0;
	}
}

module.exports = GalleryImageToken;
