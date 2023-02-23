'use strict';

const {generateForSelf, generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.'),
	NoincludeToken = require('./nowiki/noinclude'),
	GalleryImageToken = require('./link/galleryImage'),
	ImagemapLinkToken = require('./imagemapLink');

/**
 * `<imagemap>`
 * @classdesc `{childNodes: ...NoincludeToken, GalleryImageToken, ...(NoincludeToken|ImagemapLinkToken|AstText)}`
 */
class ImagemapToken extends Token {
	type = 'ext-inner';
	name = 'imagemap';

	/**
	 * 图片
	 * @returns {GalleryImageToken}
	 */
	get image() {
		return this.childNodes.find(({type}) => type === 'imagemap-image');
	}

	/**
	 * @param {string} inner 标签内部wikitext
	 * @param {accum} accum
	 * @throws `SyntaxError` 没有合法图片
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
		});
		if (!inner) {
			return;
		}
		const lines = inner.split('\n'),
			protocols = new Set(config.protocol.split('|')),
			SingleLineNoincludeToken = NoincludeToken,
			fallback = /** @param {string} line 一行文本 */ line => {
				super.insertAt(new SingleLineNoincludeToken(line, config, accum));
			};
		let first = true,
			error = false;
		for (const line of lines) {
			const trimmed = line.trim();
			if (error || !trimmed || trimmed[0] === '#') {
				//
			} else if (first) {
				const [file, ...options] = line.split('|'),
					title = this.normalizeTitle(file, 0, true);
				if (title.valid && !title.interwiki && title.ns === 6) {
					const token = new GalleryImageToken(
						file, options.length > 0 ? options.join('|') : undefined, config, accum,
					);
					token.type = 'imagemap-image';
					super.insertAt(token);
					first = false;
					continue;
				} else {
					error = true;
				}
			} else if (line.trim().split(/[\t ]/u)[0] === 'desc') {
				super.insertAt(line);
				continue;
			} else if (line.includes('[')) {
				const i = line.indexOf('['),
					substr = line.slice(i),
					mtIn = /^\[{2}([^|]+)(?:\|([^\]]+))?\]{2}[\w\s]*$/u.exec(substr);
				if (mtIn) {
					const title = this.normalizeTitle(mtIn[1], 0, true, false, true);
					if (title.valid) {
						super.insertAt(new ImagemapLinkToken(
							line.slice(0, i),
							mtIn.slice(1),
							substr.slice(substr.indexOf(']]') + 2),
							config,
							accum,
						));
						continue;
					}
				} else if (protocols.has(substr.slice(1, substr.indexOf(':') + 1))
					|| protocols.has(substr.slice(1, substr.indexOf('//') + 2))
				) {
					const mtEx = /^\[([^\]\s]+)(?:(\s+)(\S[^\]]*)?)?\][\w\s]*$/u.exec(substr);
					if (mtEx) {
						super.insertAt(new ImagemapLinkToken(
							line.slice(0, i),
							mtEx.slice(1),
							substr.slice(substr.indexOf(']') + 1),
							config,
							accum,
						));
						continue;
					}
				}
			}
			fallback(line);
		}
	}

	/**
	 * @override
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/** @override */
	text() {
		return super.text('\n').replace(/\n{2,}/gu, '\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			rect = {start, ...this.getRootNode().posFromIndex(start)};
		if (this.image) {
			errors.push(
				...this.childNodes.filter(child => {
					const str = String(child).trim();
					return child.type === 'noinclude' && str && str[0] !== '#';
				}).map(child => generateForChild(child, rect, '无效的<imagemap>链接')),
			);
		} else {
			errors.push(generateForSelf(this, rect, '缺少图片的<imagemap>'));
		}
		return errors;
	}
}

module.exports = ImagemapToken;
