'use strict';
const lint_1 = require('../util/lint');
const {generateForSelf, generateForChild} = lint_1;
const singleLine = require('../mixin/singleLine');
const Parser = require('../index');
const Token = require('.');
const NoincludeToken = require('./nowiki/noinclude');
const GalleryImageToken = require('./link/galleryImage');
const ImagemapLinkToken = require('./imagemapLink');

/**
 * `<imagemap>`
 * @classdesc `{childNodes: ...NoincludeToken, GalleryImageToken, ...(NoincludeToken|ImagemapLinkToken|AstText)}`
 */
class ImagemapToken extends Token {
	/** @browser */
	type = 'ext-inner';

	/**
	 * 图片
	 * @browser
	 */
	get image() {
		return this.childNodes.find(({type}) => type === 'imagemap-image');
	}

	/** 链接 */
	get links() {
		return this.childNodes.filter(({type}) => type === 'imagemap-link');
	}

	/**
	 * @browser
	 * @param inner 标签内部wikitext
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
			fallback = /** @param line 一行文本 */ line => {
				super.insertAt(new SingleLineNoincludeToken(line, config, accum));
			};
		let first = true,
			error = false;
		for (const line of lines) {
			const trimmed = line.trim();
			if (error || !trimmed || trimmed.startsWith('#')) {
				//
			} else if (first) {
				const [file, ...options] = line.split('|'),
					title = this.normalizeTitle(file, 0, true);
				if (title.valid && !title.interwiki && title.ns === 6) {
					const token = new GalleryImageToken('imagemap', file, options.length > 0 ? options.join('|') : undefined, config, accum);
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
					mtIn = /^\[{2}([^|]+)(?:\|([^\]]+))?\]{2}[\w\s]*$/u
						.exec(substr);
				if (mtIn) {
					const title = this.normalizeTitle(mtIn[1], 0, true, false, true);
					if (title.valid) {
						super.insertAt(new ImagemapLinkToken(line.slice(0, i), mtIn.slice(1), substr.slice(substr.indexOf(']]') + 2), config, accum));
						continue;
					}
				} else if (protocols.has(substr.slice(1, substr.indexOf(':') + 1))
					|| protocols.has(substr.slice(1, substr.indexOf('//') + 2))) {
					const mtEx = /^\[([^\]\s]+)(?:(\s+)(\S[^\]]*)?)?\][\w\s]*$/u
						.exec(substr);
					if (mtEx) {
						super.insertAt(new ImagemapLinkToken(line.slice(0, i), mtEx.slice(1), substr.slice(substr.indexOf(']') + 1), config, accum));
						continue;
					}
				}
			}
			fallback(line);
		}
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		return super.text('\n').replace(/\n{2,}/gu, '\n');
	}

	/** @private */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print({sep: '\n'});
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			rect = {start, ...this.getRootNode().posFromIndex(start)};
		if (this.image) {
			errors.push(...this.childNodes.filter(child => {
				const str = String(child).trim();
				return child.type === 'noinclude' && str && !str.startsWith('#');
			}).map(child => generateForChild(child, rect, 'invalid link in <imagemap>')));
		} else {
			errors.push(generateForSelf(this, rect, '<imagemap> without an image'));
		}
		return errors;
	}

	/** @ignore */
	insertAt(token, i = 0) {
		const {image} = this;
		if (!image && (typeof token === 'string' || token.type === 'imagemap-link' || token.type === 'text')) {
			throw new Error('当前缺少一张合法图片！');
		} else if (image && typeof token !== 'string' && token.type === 'imagemap-image') {
			throw new RangeError('已有一张合法图片！');
		}
		return super.insertAt(token, i);
	}

	/**
	 * @override
	 * @param i 移除位置
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
