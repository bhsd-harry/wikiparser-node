'use strict';

const Title = require('../../lib/title'),
	Parser = require('../..'),
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
	 * @param {Title} title 图片文件标题对象
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
		if (!Object.values(config.img).includes('width')) {
			this.seal(['size', 'width', 'height'], true);
		}
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

	/**
	 * @override
	 * @param {string} link 链接目标
	 * @throws `SyntaxError` 非法的链接目标
	 */
	setTarget(link) {
		link = String(link);
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(`<gallery>${link}</gallery>`, include, 1, config),
			{length, firstChild: gallery} = root,
			{type, lastChild: {length: galleryLength, firstChild: image}} = gallery;
		if (length !== 1 || type !== 'ext' || galleryLength !== 1 || image.type !== 'gallery-image') {
			throw new SyntaxError(`非法的图库文件名：${link}`);
		}
		const {firstChild} = image;
		image.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}
}

Parser.classes.GalleryImageToken = __filename;
module.exports = GalleryImageToken;
