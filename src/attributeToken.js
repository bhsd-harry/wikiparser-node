'use strict';

const {typeError, externalUse} = require('../util/debug'),
	{toCase} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token');

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [string]|(string|ArgToken|TranscludeToken)[]}`
 */
class AttributeToken extends Token {
	/** @type {Map<string, string|true>} */ #attr = new Map();

	/**
	 * @param {string} attr
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type
	 * @param {string} name
	 * @param {accum} accum
	 */
	constructor(attr, type, name, accum = []) {
		if (typeof attr !== 'string') {
			typeError('String');
		} else if (!['ext-attr', 'html-attr', 'table-attr'].includes(type)) {
			throw new RangeError('type 只能在 "ext-attr"、"html-attr" 和 "table-attr" 中取值！');
		} else if (attr !== 'table-attr' && attr.includes('>')) {
			throw new RangeError('扩展或HTML标签属性不能包含 ">"！');
		} else if (type === 'html-attr' && attr.includes('<')) {
			throw new RangeError('HTML标签属性不能包含 "<"！');
		}
		let stage;
		if (type === 'ext-attr') {
			stage = 0;
		} else if (type === 'html-attr') {
			stage = 2;
		} else {
			stage = 3;
		}
		super(attr, null, type !== 'ext-attr', accum, {[`Stage-${stage}`]: ':'});
		this.type = type;
		this.setAttribute('name', name).#parseAttr();
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (!Parser.debugging && key === 'attr' && externalUse('getAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.getAttribute 方法获取私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'attr') {
			return this.#attr;
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

	/** @param {string} key */
	hasAttr(key) {
		if (typeof key !== 'string') {
			typeError('String');
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
			typeError('String');
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
		if (typeof key !== 'string') {
			typeError('String');
		} else if (!['string', 'boolean'].includes(typeof value)) {
			typeError('String', 'Boolean');
		} else if (init && externalUse('setAttr')) {
			throw new Error(`手动调用 ${this.constructor.name}.setAttr 方法时禁止设置 init 参数！`);
		} else if (typeof value === 'boolean') {
			// pass
		} else if (!init && this.type === 'ext-attr' && value.includes('>')) {
			throw new RangeError('扩展标签属性不能包含 ">"！');
		}
		key = key.toLowerCase().trim();
		let parsedKey = key;
		if (this.type === 'html-attr' && !init) {
			const token = new Token(key); // 不需要真解析
			token.setAttribute('stage', 1);
			token.parseOnce();
			parsedKey = token.firstChild;
		}
		if (!/^(?:[\w:]|\x00\d+[t!~{}+-]\x7f)(?:[\w:.-]|\x00\d+[t!~{}+-]\x7f)*$/.test(parsedKey)) {
			if (init) {
				return this;
			}
			throw new RangeError(`无效的属性名：${key}！`);
		} else if (value === false) {
			this.#attr.delete(key);
		} else {
			this.#attr.set(key, value === true ? true : value.replace(/\s/g, ' ').trim());
		}
		if (!init) {
			this.#updateFromAttr();
		}
		return this;
	}

	/** @param {string} key */
	removeAttr(key) {
		if (typeof key !== 'string') {
			typeError('String');
		}
		key = key.toLowerCase().trim();
		if (this.#attr.delete(key)) {
			this.#updateFromAttr();
		}
	}

	/**
	 * @param {string} key
	 * @param {boolean|undefined} force
	 */
	toggleAttr(key, force) {
		if (typeof key !== 'string') {
			typeError('String');
		} else if (force !== undefined && typeof force !== 'boolean') {
			typeError('Boolean');
		}
		key = key.toLowerCase().trim();
		const value = this.#attr.has(key) ? this.#attr.get(key) : false;
		if (typeof value !== 'boolean') {
			throw new RangeError(`${key} 属性的值不为 Boolean！`);
		}
		this.setAttr(key, force === true || force === undefined && value === false);
	}

	/** 从`this.#attr`更新`childNodes` */
	#updateFromAttr(replace = true) {
		if (replace) {
			Parser.warn(`${this.constructor.name}.#updateFromAttr 方法会自动清除无效属性！`);
		}
		const str = [...this.#attr].map(([k, v]) => {
			if (v === true) {
				return k;
			}
			const quote = v.includes('"') ? "'" : '"';
			let equal = '=';
			if (this.type !== 'ext-attr') {
				const parameter = this.closest('parameter');
				if (parameter) {
					const /** @type {{anon: boolean, parentNode: Token}} */ {anon, parentNode} = parameter;
					if (anon && parentNode?.isTemplate()) {
						equal = '{{=}}';
					}
				}
			}
			return `${k}${equal}${quote}${v}${quote}`;
		}).join(' ');
		if (replace) { // 不能使用replaceChildren方法
			for (let i = this.childNodes.length - 1; i >= 0; i--) {
				this.removeAt(i, true);
			}
			this.insertAt(str && ` ${str}`, 0, true);
		}
		return str && ` ${str}`;
	}

	text() {
		return this.#updateFromAttr(false);
	}

	/** @returns {[number, string][]} */
	plain() {
		return [];
	}

	/** 从`childNodes`更新`this.#attr` */
	#parseAttr() {
		this.#attr.clear();
		const string = this.type === 'ext-attr'
			? this.toString()
			: this.toString().replace(/\x00\d+~\x7f|{{\s*=\s*}}/g, '=');
		for (const [, key,, quoted, unquoted] of string
			.matchAll(/([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(?:\2|$)|(\S*)))?/sg)
		) {
			this.setAttr(key, quoted ?? unquoted ?? true, true);
		}
	}

	/** @param {number} i */
	removeAt(i, done = false) {
		if (done && externalUse('removeAt')) {
			throw new RangeError(`手动调用 ${this.constructor.name}.removeAt 方法时禁止设置 done 参数！`);
		}
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
		if (done && externalUse('insertAt')) {
			throw new RangeError(`手动调用 ${this.constructor.name}.insertAt 方法时禁止设置 done 参数！`);
		}
		super.insertAt(token, i);
		if (!done) {
			this.#parseAttr();
		}
		return token;
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
