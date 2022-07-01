'use strict';

const {typeError} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 图片参数
 * @classdesc `{childNodes: ...(string|Token)}`
 */
class ImageParameterToken extends Token {
	type = 'image-parameter';
	#syntax = '';

	/**
	 * @param {string} str
	 * @param {accum} accum
	 */
	constructor(str, config = Parser.getConfig(), accum = []) {
		const regexes = Object.entries(config.img).map(
				/** @returns {[string, string, RegExp]} */
				([syntax, param]) => [syntax, param, new RegExp(`^(\\s*)${syntax.replace('$1', '(.*)')}(\\s*)$`)],
			),
			param = regexes.find(([,, regex]) => regex.test(str));
		if (!param) {
			super(str, config, true, accum);
			this.setAttribute('name', 'caption');
		} else {
			const mt = str.match(param[2]);
			if (mt.length === 3) {
				super(undefined, config, true, accum);
				this.#syntax = str;
			} else {
				super(mt[2], config, true, accum, {'Stage-2': ':', '!HeadingToken': ':'});
				this.#syntax = `${mt[1]}${param[0]}${mt[3]}`;
			}
			this.setAttribute('name', param[1]);
		}
	}

	cloneNode() {
		const cloned = this.cloneChildren(),
			config = this.getAttribute('config'),
			token = Parser.run(() => new ImageParameterToken(this.#syntax.replace('$1', ''), config));
		token.replaceChildren(...cloned);
		return token;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'syntax') {
			return this.#syntax;
		}
		return super.getAttribute(key);
	}

	isPlain() {
		return true;
	}

	#isVoid() {
		return this.#syntax && !this.#syntax.includes('$1');
	}

	toString() {
		if (!this.#syntax) {
			return super.toString();
		}
		return this.#syntax.replace('$1', super.toString());
	}

	getPadding() {
		return Math.max(0, this.#syntax.indexOf('$1'));
	}

	text() {
		if (!this.#syntax) {
			return super.text().trim();
		}
		return this.#syntax.replace('$1', super.text()).trim();
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		if (!Parser.running && this.#isVoid()) {
			throw new Error(`图片参数 ${this.name} 不接受自定义输入！`);
		}
		return super.insertAt(token, i);
	}

	/** @complexity `n` */
	getValue() {
		return this.#isVoid() || super.text();
	}

	/**
	 * @param {string|boolean} value
	 * @complexity `n`
	 */
	setValue(value) {
		if (this.#isVoid()) {
			if (typeof value !== 'boolean') {
				typeError(this, 'setValue', 'Boolean');
			} else if (value === false) {
				this.remove();
			}
			return;
		} else if (typeof value !== 'string') {
			typeError(this, 'setValue', 'String');
		}
		const root = Parser.parse(`[[File:F|${
				this.#syntax ? this.#syntax.replace('$1', value) : value
			}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root,
			param = firstElementChild?.lastElementChild;
		if (length !== 1 || !firstElementChild?.matches('file#File:F')
			|| firstElementChild.childElementCount !== 2 || param.name !== this.name
		) {
			throw new SyntaxError(`非法的 ${this.name} 参数：${value.replaceAll('\n', '\\n')}`);
		}
		this.replaceChildren(...param.childNodes);
	}
}

Parser.classes.ImageParameterToken = __filename;
module.exports = ImageParameterToken;
