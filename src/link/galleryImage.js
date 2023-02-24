'use strict';

const {generateForSelf} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	FileToken = require('./file');

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class GalleryImageToken extends FileToken {
	type = 'gallery-image';
	#invalid = false;

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
		super(link, token?.toString(), config, accum);
		this.setAttribute('bracket', false);
	}

	/**
	 * @override
	 */
	afterBuild() {
		const initImagemap = this.type === 'imagemap-image',
			titleObj = this.normalizeTitle(String(this.firstChild), initImagemap ? 0 : 6, true, !initImagemap);
		this.#invalid = titleObj.ns !== 6; // 只用于gallery-image的首次解析
	}

	/** @override */
	getPadding() {
		return 0;
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start);
		if (this.#invalid) {
			errors.push(generateForSelf(this, {start}, '无效的图库图片'));
		}
		return errors;
	}
}

module.exports = GalleryImageToken;
