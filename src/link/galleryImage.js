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

	size = undefined;
	width = undefined;
	height = undefined;

	/**
	 * @param {string} link 图片文件名
	 * @param {string|undefined} text 图片参数
	 * @param {Title} title 图片文件标题对象
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		let token;
		if (text !== undefined) {
			token = new Token(text, config, true, accum);
			token.type = 'temp';
			for (let n = 1; n < Parser.MAX_STAGE; n++) {
				token.parseOnce();
			}
			accum.splice(accum.indexOf(token), 1);
		}
		const newConfig = structuredClone(config);
		newConfig.img = Object.fromEntries(Object.entries(config.img).filter(([, param]) => param !== 'width'));
		super(link, token?.toString(), title, newConfig, accum);
		this.seal(['size', 'width', 'height'], true);
	}

	/** @override */
	getPadding() {
		return 0;
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return super.toString(selector).replaceAll('\n', ' ');
	}

	/** @override */
	text() {
		return super.text().replaceAll('\n', ' ');
	}
}

Parser.classes.GalleryImageToken = __filename;
module.exports = GalleryImageToken;
