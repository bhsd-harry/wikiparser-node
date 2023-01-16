'use strict';

const {generateForSelf} = require('../../util/lint'),
	Parser = require('../..'),
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

	/**
	 * @override
	 */
	afterBuild() {
		const {
			interwiki: initInterwiki, ns: initNs,
		} = this.normalizeTitle(String(this.firstChild), this.type === 'imagemap-image' ? 0 : 6, true);
		this.#invalid = initInterwiki || initNs !== 6; // 只用于gallery-image的首次解析
		return this;
	}

	/** @override */
	getPadding() {
		return 0;
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (this.#invalid) {
			errors.push(generateForSelf(this, this.getRootNode().posFromIndex(start), '无效的图库图片'));
		}
		return errors;
	}
}

module.exports = GalleryImageToken;
