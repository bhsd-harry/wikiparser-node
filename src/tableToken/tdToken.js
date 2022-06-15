'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	{externalUse} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('../token'),
	TableToken = require('.');

const getSubType = /** @param {string} syntax */ syntax => {
	if (syntax === '!') {
		return 'th';
	} else if (syntax.endsWith('+')) {
		return 'caption';
	}
	return 'td';
};

class TdToken extends fixedToken(TableToken) {
	#innerSyntax = '';

	/**
	 * @this {TdToken & {previousSibling: TdToken}}
	 * @returns {'td'|'th'|'caption'}
	 */
	get subtype() {
		return this.isLineStart() ? getSubType(this.getAttribute('syntax')) : this.previousSibling.subtype;
	}

	isLineStart() {
		const {previousElementSibling} = this;
		return previousElementSibling?.type !== 'td' || previousElementSibling.offsetHeight > 1;
	}

	/**
	 * @param {string} syntax
	 * @param {string} inner
	 * @param {accum} accum
	 */
	constructor(syntax, inner, config = Parser.getConfig(), accum = []) {
		const innerSyntax = inner.match(/\||\x00\d+!\x7f/),
			attr = innerSyntax ? inner.slice(0, innerSyntax.index) : '';
		super('td', syntax, attr, config, accum);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		const innerToken = new Token(inner.slice(innerSyntax?.index), config, true, accum);
		innerToken.type = 'td-inner';
		this.setAttribute('acceptable', {AttributeToken: 0, Token: 1}).appendChild(innerToken.setAttribute('stage', 4));
	}

	/** @param {...(string|Token)} elements */
	appendInner(...elements) {
		this.lastElementChild.append(...elements);
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (!Parser.debugging && key === 'innerSyntax' && externalUse('getAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.getAttribute 方法获取私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'innerSyntax') {
			return this.#innerSyntax;
		}
		return super.getAttribute(key);
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
	 */
	setAttribute(key, value) {
		if (!Parser.debugging && key === 'innerSyntax' && externalUse('setAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.setAttribute 方法设置私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'innerSyntax') {
			this.#innerSyntax = String(value);
		} else {
			super.setAttribute(key, value);
		}
		return this;
	}

	build() {
		if (this.#innerSyntax.includes('\x00')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax).map(String).join('');
		}
		return super.build();
	}

	toString() {
		return super.toString(this.#innerSyntax);
	}

	getGaps() {
		return this.#innerSyntax.length;
	}

	escape() {
		super.escape();
		this.#innerSyntax = this.#innerSyntax.replaceAll('|', '{{!}}');
	}
}

Parser.classes.TdToken = __filename;
module.exports = TdToken;
