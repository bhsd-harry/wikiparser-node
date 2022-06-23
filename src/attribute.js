'use strict';

const {typeError, externalUse} = require('../util/debug'),
	{toCase} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

const stages = {'ext-attr': 0, 'html-attr': 2, 'table-attr': 3};

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [string]|(string|ArgToken|TranscludeToken)[]}`
 */
class AttributeToken extends Token {
	/** @type {Map<string, string|true>} */ #attr = new Map();

	/** 从`this.#attr`更新`childNodes` */
	#updateFromAttr() {
		let equal = '=';
		if (this.type !== 'ext-attr') {
			const parameter = this.closest('parameter');
			if (parameter) {
				if (parameter.anon && parameter.parentNode?.matches('template, magic-word#invoke')) {
					equal = '{{=}}';
				}
			}
		}
		const str = [...this.#attr].map(([k, v]) => {
			if (v === true) {
				return k;
			}
			const quote = v.includes('"') ? "'" : '"';
			return `${k}${equal}${quote}${v}${quote}`;
		}).join(' ');
		return str && ` ${str}`;
	}

	/** 从`childNodes`更新`this.#attr` */
	#parseAttr() {
		this.#attr.clear();
		let string = this.toString(),
			token;
		if (this.type !== 'ext-attr' && !Parser.running) {
			Parser.running = true;
			const include = this.getAttribute('include'),
				config = this.getAttribute('config');
			token = new Token(string, config).setAttribute('stage', 1).parseOnce(1, include);
			string = token.firstChild;
			Parser.running = false;
		}
		string = string.replace(/\x00\d+~\x7f/g, '=');
		const build = /** @param {string|boolean} str */ str => {
			return typeof str === 'boolean' || !(token instanceof Token)
				? str
				: token.buildFromStr(str).map(String).join('');
		};
		for (const [, key,, quoted, unquoted] of string
			.matchAll(/([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(?:\2|$)|(\S*)))?/sg)
		) {
			this.setAttr(build(key), build(quoted ?? unquoted ?? true), true);
		}
	}

	/**
	 * @param {string} attr
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type
	 * @param {string} name
	 * @param {accum} accum
	 */
	constructor(attr, type, name, config = Parser.getConfig(), accum = []) {
		super(attr, config, type !== 'ext-attr', accum, {[`Stage-${stages[type]}`]: ':'});
		this.type = type;
		this.setAttribute('name', name).#parseAttr();
	}

	cloneNode() {
		const cloned = this.cloneChildren();
		Parser.running = true;
		const token = new AttributeToken(undefined, this.type, this.name, this.getAttribute('config'));
		token.append(...cloned);
		token.afterBuild();
		Parser.running = false;
		return token;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'attr') {
			return new Map(this.#attr);
		}
		return super.getAttribute(key);
	}

	build() {
		super.build();
		if (this.type === 'ext-attr') {
			return this;
		}
		for (let [key, text] of this.#attr) {
			let built = false;
			if (key.includes('\x00')) {
				this.#attr.delete(key);
				key = this.buildFromStr(key).map(String).join('');
				built = true;
			}
			if (typeof text === 'string' && text.includes('\x00')) {
				text = this.buildFromStr(text).map(String).join('');
				built = true;
			}
			if (built) {
				this.#attr.set(key, text);
			}
		}
		return this;
	}

	afterBuild() {
		super.afterBuild();
		const that = this,
			/** @type {AstListener} */ attributeListener = ({type, target}) => {
				if (type === 'text' || target !== that) {
					that.#parseAttr();
				}
			};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], attributeListener);
		return this;
	}

	/** @param {string} key */
	hasAttr(key) {
		if (typeof key !== 'string') {
			typeError(this, 'hasAttr', 'String');
		}
		return this.#attr.has(key.toLowerCase().trim());
	}

	/**
	 * @template {string|undefined} T
	 * @param {T} key
	 * @returns {T extends string ? string|true : Record<string, string|true>}
	 */
	getAttr(key) {
		if (key === undefined) {
			return Object.fromEntries(this.#attr);
		} else if (typeof key !== 'string') {
			typeError(this, 'getAttr', 'String');
		}
		return this.#attr.get(key.toLowerCase().trim());
	}

	getAttrNames() {
		return [...this.#attr.keys()];
	}

	hasAttrs() {
		return this.getAttrNames().length > 0;
	}

	/**
	 * @param {string} key
	 * @param {string|boolean} value
	 */
	setAttr(key, value, init = false) {
		init &&= !externalUse('setAttr');
		if (typeof key !== 'string' || !['string', 'boolean'].includes(typeof value)) {
			typeError(this, 'setValue', 'String', 'Boolean');
		} else if (typeof value === 'boolean') {
			// pass
		} else if (!init && this.type === 'ext-attr' && value.includes('>')) {
			throw new RangeError('扩展标签属性不能包含 ">"！');
		}
		key = key.toLowerCase().trim();
		let parsedKey = key;
		if (this.type !== 'ext-attr' && !init) {
			Parser.running = true;
			const token = new Token(key, this.getAttribute('config')).setAttribute('stage', 1)
				.parseOnce(1, this.getAttribute(1, 'include'));
			Parser.running = false;
			parsedKey = token.firstChild;
		}
		if (!/^(?:[\w:]|\x00\d+[t!~{}+-]\x7f)(?:[\w:.-]|\x00\d+[t!~{}+-]\x7f)*$/.test(parsedKey)) {
			if (init) {
				return;
			}
			throw new RangeError(`无效的属性名：${key}！`);
		} else if (value === false) {
			this.#attr.delete(key);
		} else {
			this.#attr.set(key, value === true ? true : value.replace(/\s/g, ' ').trim());
		}
		if (!init) {
			this.replaceChildren(this.#updateFromAttr(), true);
		}
	}

	/** @param {string} key */
	removeAttr(key) {
		if (typeof key !== 'string') {
			typeError(this, 'removeAttr', 'String');
		}
		key = key.toLowerCase().trim();
		if (this.#attr.delete(key)) {
			this.replaceChildren(this.#updateFromAttr(), true);
		}
	}

	/**
	 * @param {string} key
	 * @param {boolean|undefined} force
	 */
	toggleAttr(key, force) {
		if (typeof key !== 'string') {
			typeError(this, 'toggleAttr', 'String');
		} else if (force !== undefined) {
			force = Boolean(force);
		}
		key = key.toLowerCase().trim();
		const value = this.#attr.has(key) ? this.#attr.get(key) : false;
		if (typeof value !== 'boolean') {
			throw new RangeError(`${key} 属性的值不为 Boolean！`);
		}
		this.setAttr(key, force === true || force === undefined && value === false);
	}

	text() {
		return this.#updateFromAttr();
	}

	/** @returns {[number, string][]} */
	plain() {
		return [];
	}

	/** @param {number} i */
	removeAt(i, done = false) {
		done &&= !externalUse('removeAt');
		done ||= Parser.running;
		const token = super.removeAt(i);
		if (!done) {
			this.#parseAttr();
		}
		return token;
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 */
	insertAt(token, i = this.childNodes.length, done = false) {
		done &&= !externalUse('insertAt');
		done ||= Parser.running;
		super.insertAt(token, i);
		if (!done) {
			this.#parseAttr();
		}
		return token;
	}

	/** @param {...string|Token} elements */
	replaceChildren(...elements) {
		let done = false;
		if (typeof elements.at(-1) === 'boolean') {
			done = elements.pop();
		}
		done &&= !externalUse('replaceChildren');
		for (let i = this.childNodes.length - 1; i >= 0; i--) {
			this.removeAt(i, done);
		}
		for (const element of elements) {
			this.insertAt(element, undefined, done);
		}
	}

	/**
	 * @param {string} key
	 * @param {string|undefined} equal - `equal`存在时`val`和`i`也一定存在
	 * @param {string|undefined} val
	 * @param {string|undefined} i
	 */
	matchesAttr(key, equal, val, i) {
		if (externalUse('matchesAttr')) {
			throw new Error(`禁止外部调用 ${this.constructor.name}.matchesAttr 方法！`);
		} else if (!equal) {
			return this.hasAttr(key);
		} else if (!this.hasAttr(key)) {
			return equal === '!=';
		}
		val = toCase(val, i);
		const attr = this.getAttr(key),
			thisVal = toCase(attr === true ? '' : attr, i);
		switch (equal) {
			case '~=':
				return attr !== true && thisVal.split(/\s/).some(v => v === val);
			case '|=': // 允许`val === ''`
				return thisVal === val || thisVal.startsWith(`${val}-`);
			case '^=':
				return attr !== true && thisVal.startsWith(val);
			case '$=':
				return attr !== true && thisVal.endsWith(val);
			case '*=':
				return attr !== true && thisVal.includes(val);
			case '!=':
				return thisVal !== val;
			default: // `=`
				return thisVal === val;
		}
	}
}

Parser.classes.AttributeToken = __filename;
module.exports = AttributeToken;
