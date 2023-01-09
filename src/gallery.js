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
		super(undefined, config, true, accum);
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line);
			if (!matches) {
				this.appendChild(line.trim() ? new HiddenToken(line, undefined, config, [], {AstText: ':'}) : line);
				continue;
			}
			const [, file, alt] = matches;
			let /** @type {boolean} */ valid;
			try {
				({valid} = this.normalizeTitle(decodeURIComponent(file), 6, true));
			} catch {
				({valid} = this.normalizeTitle(file, 6, true));
			}
			if (valid) {
				this.appendChild(new GalleryImageToken(file, alt, config, accum));
			} else {
				this.appendChild(new HiddenToken(line, undefined, config, []));
			}
		}
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
	print() {
		return super.print({sep: '\n'});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const root = this.getRootNode(),
			{top, left} = root.posFromIndex(start),
			/** @type {LintError[]} */ errors = [];
		for (let i = 0, cur = start; i < this.childNodes.length; i++) {
			const child = this.childNodes[i],
				str = String(child);
			if (child.type === 'hidden' && !/^<!--.*-->$/u.test(str)) {
				errors.push({
					message: '图库中的无效内容',
					startLine: top + i,
					endLine: top + i,
					startCol: i ? 0 : left,
					endCol: i ? str.length : left + str.length,
				});
			} else if (child.type !== 'hidden' && child.type !== 'text') {
				errors.push(...child.lint(cur));
			}
			cur += str.length + 1;
		}
	}
}

module.exports = GalleryToken;
