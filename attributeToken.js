'use strict';
const Token = require('./token'),
	AtomToken = require('./atomToken'),
	{typeError, numberToString, externalUse, toCase} = require('./util');

class AttributeToken extends AtomToken {
	/** @type {Object<string, string|true>} */ #attr;

	/**
	 * @param {string|number|Token|(string|Token)[]} attr
	 * @param {Token|'ext-attr'|'html-attr'} parent
	 * @param {Token[]} accum
	 */
	constructor(attr, parent, accum = []) {
		let /** @type {string} */ type;
		if (parent instanceof Token) {
			type = `${parent.type}-attr`;
		} else {
			type = parent;
			parent = null;
		}
		attr = (Array.isArray(attr) ? attr : [attr]).map(numberToString);
		if (!['ext-attr', 'html-attr'].includes(type)) {
			throw new RangeError('type只能在ext-attr和html-attr中取值！');
		} else if (attr.some(str => typeof str === 'string' && str.includes('>'))) {
			throw new RangeError('扩展或HTML标签属性不能包含">"！');
		} else if (type === 'html-attr' && attr.some(str => typeof str === 'string' && str.includes('<'))) {
			throw new RangeError('HTML标签属性不能包含"<"！');
		} else if (type === 'ext-attr') {
			attr = attr.join('');
		}
		super(attr, type, parent, accum, ['String', ...type === 'ext-attr' ? [] : ['ArgToken', 'TranscludeToken']]);
		if (parent?.name) {
			this.name = parent.name;
		}
		const that = this;
		this.#parseAttr().on('parentReset', function attribute(oldParent, newParent) {
			if (that.type.slice(0, -5) !== newParent.type) {
				that.set('parent', oldParent);
				throw new Error('AttributeToken: 不能更改父节点的type！');
			}
		});
		if (this.type === 'ext-attr') {
			this.unremovableChild(0);
		} else {
			this.on('childDetached childReplaced', function attribute() {
				that.#parseAttr();
			});
		}
	}

	build() {
		super.build();
		if (this.type === 'ext-attr') {
			return this;
		}
		for (let key in this.#attr) {
			let text = this.#attr[key];
			if (key.includes('\x00')) {
				delete this.#attr[key];
				key = this.buildOnce(key).toString();
			}
			if (typeof text === 'string' && text.includes('\x00')) {
				text = this.buildOnce(text).toString();
			}
			this.#attr[key] = text;
		}
		return this;
	}

	#parseAttr() {
		this.#attr = {};
		for (const [, key,, quoted, unquoted] of this.toString()
			.matchAll(/([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(?:\2|$)|(\S*)))?/sg)
		) {
			this.setAttr(key, quoted ?? unquoted ?? true, true);
		}
		return this;
	}

	// ------------------------------ override superclass ------------------------------ //

	/**
	 * @param {string|number|Token|(string|Token)[]} args
	 * @param {number|undefined} i
	 */
	insert(args, i) {
		if (this.type === 'ext-attr') {
			throw new Error('扩展标签属性只能是字符串！');
		}
		super.insert(args, i);
		return this.#parseAttr();
	}

	/** @param {...string|number|Token} args */
	delete(...args) {
		if (this.type === 'ext-attr') {
			throw new Error('扩展标签属性只能是字符串！');
		}
		super.delete(...args);
		return this.#parseAttr();
	}

	/**
	 * @param {string|number|Token|(string|Token)[]} str
	 * @param {boolean} done - 是否已更新#attr
	 */
	content(str, done) {
		if (this.type === 'ext-attr' && typeof str !== 'string') {
			typeError('String');
		} else if (this.type === 'ext-attr') {
			this.$children[0] = str;
		} else {
			super.content(str);
		}
		if (done) {
			return this;
		}
		return this.#parseAttr();
	}

	/**
	 * @param {string} key
	 * @param {string|undefined} equal - equal存在时val和i也一定存在
	 * @param {string|undefined} val
	 * @param {string|undefined} i
	 */
	isAttr(key, equal, val, i) {
		if (externalUse()) {
			throw new Error('禁止外部调用Token.isAttr方法！');
		}
		val = toCase(val, i);
		const /** @type {string|true|undefined} */ attr = this.getAttr(key),
			thisVal = toCase(attr, i);
		switch (equal) {
			case '~=':
				return typeof attr === 'string' && thisVal.split(/\s/).some(v => v === val);
			case '|=':
				return attr !== undefined && (thisVal === val || thisVal.startsWith(`${val}-`));
			case '^=':
				return attr !== undefined && thisVal.startsWith(val);
			case '$=':
				return attr !== undefined && thisVal.endsWith(val);
			case '*=':
				return attr !== undefined && thisVal.includes(val);
			case '!=':
				return attr === undefined || thisVal !== val;
			case '=':
				return attr !== undefined && thisVal === val;
			default:
				return attr !== undefined;
		}
	}

	// ------------------------------ attribute modification ------------------------------ //

	/**
	 * @param {string|undefined} key
	 * @returns {string|true|undefined|Object<string, string|true>}
	 */
	getAttr(key) {
		if (key !== undefined && typeof key !== 'string') {
			typeError('String');
		}
		return key === undefined ? this.#attr : this.#attr[key.toLowerCase().trim()];
	}

	#updateFromAttr() {
		Token.warn(true, '这个方法会自动清除嵌入的模板和无效属性！');
		const str = Object.entries(this.#attr).map(([k, v]) => {
			if (v === true) {
				return k;
			}
			const quote = v.includes('"') ? "'" : '"';
			return `${k}=${quote}${v}${quote}`;
		}).join(' ');
		this.content(str && ` ${str}`, true);
	}

	empty() {
		this.#attr = {};
		return this.content('', true);
	}

	/** @param {string|undefined} key */
	removeAttr(key) {
		if (key === undefined) {
			return this.empty();
		} else if (typeof key !== 'string') {
			typeError('String');
		}
		key = key.toLowerCase().trim();
		if (key in this.#attr) {
			delete this.#attr[key];
			this.#updateFromAttr();
		}
		return this;
	}

	/**
	 * @param {string} key
	 * @param {string|number|true|undefined} value
	 * @param {boolean} init
	 */
	setAttr(key, value, init) {
		if (typeof key !== 'string') {
			typeError('String');
		}
		value = numberToString(value);
		if (value === undefined) {
			return this.removeAttr(key);
		} else if (value === true) {
			// pass
		} else if (typeof value !== 'string') {
			typeError('String');
		} else if (value.includes('>')) {
			throw new RangeError('扩展或HTML标签属性不能包含">"！');
		} else if (this.type === 'html-attr' && value.includes('<')) {
			throw new RangeError('HTML标签属性不能包含"<"！');
		}
		key = key.toLowerCase().trim();
		if (!/^(?:[\w:]|\x00\d+t\x7f)(?:[\w:.-]|\x00\d+t\x7f)*$/.test(key)) {
			throw new RangeError('无效的属性名！');
		}
		this.#attr[key] = value === true ? true : value.replace(/\s/g, ' ').trim();
		if (!init) {
			this.#updateFromAttr();
		}
		return this;
	}
}

Token.classes.AttributeToken = AttributeToken;

module.exports = AttributeToken;
