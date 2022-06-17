'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	LinkToken = require('.'),
	Token = require('../token');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class CategoryToken extends LinkToken {
	type = 'category';

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {string} title
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, text, title, config, accum);
		this.#updateSortkey();
		const that = this;
		this.addEventListener(['remove', 'insert', 'replace', 'text'], ({prevTarget}) => {
			if (prevTarget.type === 'link-text') {
				that.#updateSortkey();
			}
		});
	}

	#updateSortkey() {
		this.sortkey = this.children[1]?.text()
			?.replace(/&#(\d+);/g, /** @param {string} p1 */ (_, p1) => String.fromCharCode(Number(p1)))
			?.replace(/&#x([\da-f]+);/gi, /** @param {string} p1 */ (_, p1) => String.fromCharCode(parseInt(p1, 16)))
			?.replaceAll('\n', '');
		if (!this.sortkey) {
			delete this.sortkey;
		}
	}

	/** @param {number} i */
	removeAt(i) {
		if (i === 1) {
			delete this.sortkey;
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
		if (i === 1) {
			this.#updateSortkey();
		}
		return token;
	}

	text() {
		return `[[${this.firstElementChild.text()}]]`;
	}

	/** @returns {[number, string][]} */
	plain() {
		return [];
	}

	/**
	 * @this {CategoryToken & {lastChild: Token}}
	 * @param {string} text
	 */
	setText(text) {
		text = String(text);
		const root = new Token(`[[Category:C|${text}]]`, this.getAttribute('config')).parse(6),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'category' || firstElementChild.childElementCount !== 2) {
			throw new SyntaxError(`非法的分类关键字：${text.replaceAll('\n', '\\n')}`);
		}
		const {lastChild} = firstElementChild;
		if (this.childElementCount === 1) {
			this.appendChild(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
		this.#updateSortkey();
	}

	/** @param {string} text */
	setSortkey(text) {
		this.setText(text);
	}
}

Parser.classes.CategoryToken = __filename;
module.exports = CategoryToken;
