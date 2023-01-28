'use strict';

const {generateForSelf, generateForChild} = require('../util/lint'),
	singleLine = require('../mixin/singleLine'),
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
	 * 链接
	 * @returns {ImagemapLinkToken[]}
	 */
	get links() {
		return this.childNodes.filter(({type}) => type === 'imagemap-link');
	}

	/**
	 * @param {string} inner 标签内部wikitext
	 * @param {accum} accum
	 * @throws `SyntaxError` 没有合法图片
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			GalleryImageToken: ':', ImagemapLinkToken: ':', SingleLineNoincludeToken: ':', AstText: ':',
		});
		if (!inner) {
			return;
		}
		const lines = inner.split('\n'),
			protocols = new Set(config.protocol.split('|')),
			SingleLineNoincludeToken = singleLine(NoincludeToken),
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
						file, options.length > 0 ? options.join('|') : undefined, title, config, accum,
					);
					token.type = 'imagemap-image';
					super.insertAt(token);
					first = false;
					continue;
				} else {
					Parser.error('<imagemap>标签内必须先包含一张合法图片！', line);
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
					const title = this.normalizeTitle(mtIn[1], 0, true);
					if (title.valid) {
						super.insertAt(new ImagemapLinkToken(
							line.slice(0, i),
							[...mtIn.slice(1), title],
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
	 * @param {string} selector
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

	/** @override */
	print() {
		return super.print({sep: '\n', class: !this.image && 'ext-inner wpb-error'});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
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

	/**
	 * @override
	 * @template {string|Token} T
	 * @param {T} token 待插入的节点
	 * @param {number} i 插入位置
	 * @throws `Error` 当前缺少合法图片
	 * @throws `RangeError` 已有一张合法图片
	 */
	insertAt(token, i = 0) {
		const {image} = this;
		if (!image && (token.type === 'imagemap-link' || token.type === 'text')) {
			throw new Error('当前缺少一张合法图片！');
		} else if (image && token.type === 'imagemap-image') {
			throw new RangeError('已有一张合法图片！');
		}
		return super.insertAt(token, i);
	}

	/**
	 * @override
	 * @param {number} i 移除位置
	 * @throws `Error` 禁止移除图片
	 */
	removeAt(i) {
		const child = this.childNodes[i];
		if (child.type === 'imagemap-image') {
			throw new Error('禁止移除<imagemap>内的图片！');
		}
		return super.removeAt(i);
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new ImagemapToken(undefined, this.getAttribute('config'));
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes.ImagemapToken = __filename;
module.exports = ImagemapToken;
