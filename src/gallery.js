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
	 * @returns {LintError[]}
	 */
	lint() {
		const root = this.getRootNode(),
			{top} = root.posFromIndex(root.getAbsoluteIndex());
		return this.childNodes.flatMap((child, i) => {
			if (child.type === 'hidden') {
				const str = String(child),
					startLine = top + i;
				return /^<!--.*-->$/u.test(str)
					? []
					: {message: '图库中的无效内容', startLine, endLine: startLine, startCol: 0, endCol: str.length};
			} else if (child.type === 'text') {
				return [];
			}
			return child.lint();
		});
	}
}

module.exports = GalleryToken;
