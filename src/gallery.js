'use strict';

const {text} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.'),
	GalleryImageToken = require('./link/galleryImage');

/**
 * gallery标签
 * @classdesc `{childNodes: (string|FileToken)[]]}`
 */
class GalleryToken extends Token {
	type = 'ext-inner';
	name = 'gallery';

	/**
	 * @param {string} inner 标签内部wikitext
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {String: ':', GalleryImageToken: ':'});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line);
			if (!matches) {
				this.appendChild(line);
				continue;
			}
			const [, file, alt] = matches;
			let title;
			try {
				title = this.normalizeTitle(decodeURIComponent(file), 6, true);
			} catch {
				title = this.normalizeTitle(file, 6, true);
			}
			if (title.valid) {
				this.appendChild(new GalleryImageToken(file, alt, title, config, accum));
			} else {
				this.appendChild(line);
			}
		}
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildren(),
			token = Parser.run(() => new GalleryToken(undefined, this.getAttribute('config')));
		token.append(...cloned);
		return token;
	}

	/** @override */
	toString() {
		return super.toString('\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	text() {
		return text(this.children, '\n');
	}

	/**
	 * 插入图片
	 * @param {string} file 图片文件名
	 * @param {number} i 插入位置
	 * @throws `SyntaxError` 非法的文件名
	 */
	insertImage(file, i = this.childNodes.length) {
		let title;
		try {
			title = this.normalizeTitle(decodeURIComponent(file), 6, true);
		} catch {
			title = this.normalizeTitle(file, 6, true);
		}
		if (!title.valid) {
			throw new SyntaxError(`非法的文件名：${file}`);
		}
		const token = Parser.run(() => new GalleryImageToken(file, undefined, title, this.getAttribute('config')));
		return this.insertAt(token, i);
	}
}

Parser.classes.GalleryToken = __filename;
module.exports = GalleryToken;
