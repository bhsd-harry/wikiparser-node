'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	LinkToken = require('.'),
	Token = require('..');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class CategoryToken extends LinkToken {
	type = 'category';
	sortkey = '';

	setLangLink = undefined;
	setFragment = undefined;
	asSelfLink = undefined;
	pipeTrick = undefined;

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {Title} title
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, text, title, config, accum);
		this.seal(['sortkey', 'setFragment', 'asSelfLink', 'pipeTrick']);
	}

	afterBuild() {
		super.afterBuild();
		this.#updateSortkey();
		const that = this;
		const /** @type {AstListener} */ categoryListener = ({prevTarget}) => {
			if (prevTarget?.type === 'link-text') {
				that.#updateSortkey();
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], categoryListener);
		return this;
	}

	#updateSortkey() {
		this.setAttribute('sortkey', this.children[1]?.text()
			?.replace(/&#(\d+);/g, /** @param {string} p1 */ (_, p1) => String.fromCodePoint(Number(p1)))
			?.replace(/&#x([\da-f]+);/gi, /** @param {string} p1 */ (_, p1) => String.fromCodePoint(parseInt(p1, 16)))
			?.replaceAll('\n', '') ?? '',
		);
	}

	/** @param {number} i */
	removeAt(i) {
		if (i === 1) {
			this.setAttribute('sortkey', '');
		}
		return super.removeAt(i);
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 * @param {number} i
	 */
	insertAt(token, i) {
		super.insertAt(token, i);
		if (i === 1 && !Parser.running) {
			this.#updateSortkey();
		}
		return token;
	}

	/** @returns {string} */
	text() {
		return `[[${this.firstElementChild.text()}]]`;
	}

	/** @param {string} text */
	setSortkey(text) {
		this.setLinkText(text);
	}
}

Parser.classes.CategoryToken = __filename;
module.exports = CategoryToken;
