'use strict';

const {text, noWrap, extUrlChar} = require('../util/string'),
	Title = require('../lib/title'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 图片参数
 * @classdesc `{childNodes: ...(string|Token)}`
 */
class ImageParameterToken extends Token {
	type = 'image-parameter';
	#syntax = '';

	static #noLink = Symbol('no-link');

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {string} value
	 * @returns {T extends 'link' ? string|Symbol : boolean}
	 */
	static #validate(key, value, config = Parser.getConfig()) {
		value = value.replace(/\0\d+t\x7f/g, '').trim();
		if (key === 'width') {
			return /^\d*(?:x\d*)?$/.test(value);
		} else if (['alt', 'class', 'manualthumb', 'frameless', 'framed', 'thumbnail'].includes(key)) {
			return true;
		} else if (key === 'link') {
			if (!value) {
				return this.#noLink;
			}
			const regex = RegExp(`(?:${config.protocol}|//)${extUrlChar}(?=\0\\d+t\x7f|$)`, 'iu');
			if (regex.test(value)) {
				return value;
			}
			if (value.startsWith('[[') && value.endsWith(']]')) {
				value = value.slice(2, -2);
			}
			if (value.includes('%')) {
				try {
					value = decodeURIComponent(value);
				} catch {}
			}
			const {title, fragment, valid} = new Title(value, 0, config);
			return valid && `${title}${fragment && '#'}${fragment}`;
		}
		return !isNaN(value);
	}

	get link() {
		if (this.name === 'link') {
			return ImageParameterToken.#validate('link', this.getValue(), this.getAttribute('config'));
		}
		return undefined;
	}
	set link(value) {
		if (this.name === 'link') {
			value = value === ImageParameterToken.#noLink ? '' : value;
			this.setValue(value);
		}
	}
	get size() {
		if (this.name === 'width') {
			const /** @type {string} */ size = this.getValue().trim();
			if (!size.includes('{{')) {
				const [width, height = ''] = size.split('x');
				return {width, height};
			}
			const token = Parser.parse(size, false, 2, this.getAttribute('config')),
				{childNodes} = token,
				i = childNodes.findIndex(child => typeof child === 'string' && child.includes('x'));
			if (i === -1) {
				return {width: size, height: ''};
			}
			token.splitText(i, childNodes[i].indexOf('x'));
			token.splitText(i + 1, 1);
			return {width: text(token.childNodes.slice(0, i + 1)), height: text(token.childNodes.slice(i + 2))};
		}
		return undefined;
	}
	get width() {
		return this.size?.width;
	}
	set width(width) {
		if (this.name === 'width') {
			const {height} = this;
			this.setValue(`${String(width || '')}${height && 'x'}${height}`);
		}
	}
	get height() {
		return this.size?.height;
	}
	set height(height) {
		height = String(height || '');
		if (this.name === 'width') {
			this.setValue(`${this.width}${height && 'x'}${height}`);
		}
	}

	/**
	 * @param {string} str
	 * @param {accum} accum
	 */
	constructor(str, config = Parser.getConfig(), accum = []) {
		const regexes = Object.entries(config.img).map(
				/** @returns {[string, string, RegExp]} */
				([syntax, param]) => [syntax, param, RegExp(`^(\\s*)${syntax.replace('$1', '(.*)')}(\\s*)$`)],
			),
			param = regexes.find(([,, regex]) => regex.test(str));
		if (param) {
			const mt = param[2].exec(str);
			if (mt.length === 4 && !ImageParameterToken.#validate(param[1], mt[2], config)) {
				// pass
			} else {
				if (mt.length === 3) {
					super(undefined, config, true, accum);
					this.#syntax = str;
				} else {
					super(mt[2], config, true, accum, {'Stage-2': ':', '!HeadingToken': ':'});
					this.#syntax = `${mt[1]}${param[0]}${mt[3]}`;
				}
				this.setAttribute('name', param[1]).setAttribute('stage', Parser.MAX_STAGE);
				return;
			}
		}
		super(str, config, true, accum);
		this.setAttribute('name', 'caption').setAttribute('stage', 7);
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
				this.typeError('setValue', 'Boolean');
			} else if (value === false) {
				this.remove();
			}
			return;
		} else if (typeof value !== 'string') {
			this.typeError('setValue', 'String');
		}
		const root = Parser.parse(`[[File:F|${
				this.#syntax ? this.#syntax.replace('$1', value) : value
			}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{childNodes: {length}, firstElementChild} = root,
			param = firstElementChild?.lastElementChild;
		if (length !== 1 || !firstElementChild?.matches('file#File:F')
			|| firstElementChild.childNodes.length !== 2 || param.name !== this.name
		) {
			throw new SyntaxError(`非法的 ${this.name} 参数：${noWrap(value)}`);
		}
		this.replaceChildren(...param.childNodes);
	}
}

Parser.classes.ImageParameterToken = __filename;
module.exports = ImageParameterToken;
