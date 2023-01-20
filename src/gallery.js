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
		super(undefined, config, true, accum, {AstText: ':', GalleryImageToken: ':', HiddenToken: ':'});
		const newConfig = structuredClone(config);
		for (const [k, v] of Object.entries(config.img)) {
			if (v === 'width') {
				delete newConfig.img[k];
			}
		}
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line);
			if (!matches) {
				super.insertAt(line.trim() ? new HiddenToken(line, undefined, config, [], {AstText: ':'}) : line);
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
				super.insertAt(new GalleryImageToken(file, alt, title, newConfig, accum));
			} else {
				super.insertAt(new HiddenToken(line, undefined, config, [], {AstText: ':'}));
			}
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
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const {top, left} = this.getRootNode().posFromIndex(start),
			/** @type {LintError[]} */ errors = [];
		for (let i = 0, cur = start; i < this.childNodes.length; i++) {
			const child = this.childNodes[i],
				str = String(child),
				trimmed = str.trim();
			if (child.type === 'hidden' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				errors.push({
					message: '图库中的无效内容',
					severity: 'error',
					startLine: top + i,
					endLine: top + i,
					startCol: i ? 0 : left,
					endCol: i ? str.length : left + str.length,
					excerpt: String(child).slice(0, 50),
				});
			} else if (child.type !== 'hidden' && child.type !== 'text') {
				errors.push(...child.lint(cur));
			}
			cur += str.length + 1;
		}
		return errors;
	}
}

module.exports = GalleryToken;
