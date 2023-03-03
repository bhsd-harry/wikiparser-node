'use strict';

const Parser = require('..'),
	Token = require('.'),
	GalleryImageToken = require('./link/galleryImage'),
	HiddenToken = require('./atom/hidden');

const params = new Set(['alt', 'link']);

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
		super(undefined, config, true, accum, {
		});
		const img = {},
			/** @type {ParserConfig} */ newConfig = {...config, img};
		for (const [k, v] of Object.entries(config.img)) {
			if (params.has(v)) {
				img[k] = v;
			}
		}
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line);
			if (!matches) {
				super.insertAt(line.trim()
					? new HiddenToken(line, undefined, newConfig, [], {
					})
					: line);
				continue;
			}
			const [, file, alt] = matches,
				title = this.normalizeTitle(file, 6, true, true);
			if (title.valid) {
				super.insertAt(new GalleryImageToken(file, alt, newConfig, accum));
			} else {
				super.insertAt(new HiddenToken(line, undefined, newConfig, [], {
				}));
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

	/** @override */
	print() {
		return super.print({sep: '\n'});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start) {
		const {top, left} = this.getRootNode().posFromIndex(start),
			/** @type {LintError[]} */ errors = [];
		for (let i = 0, startIndex = start; i < this.length; i++) {
			const child = this.childNodes[i],
				str = String(child),
				{length} = str,
				trimmed = str.trim(),
				startLine = top + i,
				startCol = i ? 0 : left;
			if (child.type === 'hidden' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				errors.push({
					message: Parser.msg('invalid content in <$1>', 'gallery'),
					severity: 'error',
					startIndex,
					endIndex: startIndex + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
				});
			} else if (child.type !== 'hidden' && child.type !== 'text') {
				errors.push(...child.lint(startIndex));
			}
			startIndex += length + 1;
		}
		return errors;
	}
}

module.exports = GalleryToken;
