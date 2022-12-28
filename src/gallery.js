'use strict';

const /** @type {Parser} */ Parser = require('..'),
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
	 * @param {string} inner
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/.exec(line);
			if (!matches) {
				this.appendChild(line);
				continue;
			}
			const [, file, alt] = matches;
			let title;
			try {
				title = this.normalizeTitle(decodeURIComponent(file), 6);
			} catch {
				title = this.normalizeTitle(file, 6);
			}
			if (!title.valid) {
				this.appendChild(line);
			} else {
				this.appendChild(new GalleryImageToken(file, alt, title, config, accum));
			}
		}
	}

	toString() {
		return super.toString('\n');
	}

	print() {
		return super.print({sep: '\n', wrap: s => `<span class="wpb-error">${s}</span>`});
	}
}

module.exports = GalleryToken;
