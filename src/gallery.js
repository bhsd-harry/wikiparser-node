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
	 * @param {string} inner
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {String: ':', GalleryImageToken: ':'});
		for (const line of inner?.split('\n') ?? []) {
			const matches = line.match(/^([^|]+)(?:\|(.*))?/);
			if (!matches) {
				this.appendChild(line);
				continue;
			}
			const [, file, alt] = matches,
				title = this.normalizeTitle(file.includes('%') ? decodeURIComponent(file) : file, 6, true);
			if (!title.valid) {
				this.appendChild(line);
			} else {
				this.appendChild(new GalleryImageToken(title.title, alt, title, config, accum));
			}
		}
	}

	toString() {
		return super.toString('\n');
	}

	text() {
		return text(this.children, '\n');
	}
}

Parser.classes.GalleryToken = __filename;
module.exports = GalleryToken;
