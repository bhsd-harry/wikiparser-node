'use strict';

const Parser = require('..'),
	Token = require('.'),
	GalleryImageToken = require('./link/galleryImage'),
	HiddenToken = require('./atom/hidden');

/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|HiddenToken|AstText)}`
 */
class GalleryToken extends Token {
	type = 'ext-inner';
	name = 'gallery';

	/**
	 * @param {string} inner 标签内部wikitext
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AstText: ':', GalleryImageToken: ':'});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line);
			if (!matches) {
				this.appendChild(line.trim() ? new HiddenToken(line, undefined, config, [], {AstText: ':'}) : line);
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
				this.appendChild(new HiddenToken(line, undefined, config, [], {AstText: ':'}));
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

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	text() {
		return super.text('\n').replaceAll(/\n\s*\n/gu, '\n');
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
