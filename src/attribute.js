'use strict';

const {externalUse} = require('../util/debug'),
	{generateForSelf} = require('../util/lint'),
	{toCase, removeComment, normalizeSpace} = require('../util/string'),
	Parser = require('..'),
	Token = require('.');

const stages = {'ext-attr': 0, 'html-attr': 2, 'table-attr': 3};

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AstText]|(AstText|ArgToken|TranscludeToken)[]}`
 */
class AttributeToken extends Token {
	/** @type {Map<string, string|true>} */ #attr = new Map();
	#sanitized = true;
	#quoteBalance = true;

	/**
	 * @override
	 * @param {string} key 属性键
	 * @param {string|undefined} equal 属性规则运算符，`equal`存在时`val`和`i`也一定存在
	 * @param {string|undefined} val 属性值
	 * @param {string|undefined} i 是否对大小写不敏感
	 */
	#matchesAttr = (key, equal, val, i) => {
		if (!equal) {
			return this.hasAttr(key);
		} else if (!this.hasAttr(key)) {
			return equal === '!=';
		}
		val = toCase(val, i);
		const attr = this.getAttr(key),
			thisVal = toCase(attr === true ? '' : attr, i);
		switch (equal) {
			case '~=':
				return attr !== true && thisVal.split(/\s/u).includes(val);
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
	};

	/**
	 * getAttr()方法的getter写法
	 * @returns {Record<string, string|true>}
	 */
	get attributes() {
		return this.getAttr();
	}

	/** 以字符串表示的class属性 */
	get className() {
		const attr = this.getAttr('class');
		return typeof attr === 'string' ? attr : '';
	}

	set className(className) {
		this.setAttr('class', className);
	}

	/** 以Set表示的class属性 */
	get classList() {
		return new Set(this.className.split(/\s/u));
	}

	/** id属性 */
	get id() {
		const attr = this.getAttr('id');
		return typeof attr === 'string' ? attr : '';
	}

	set id(id) {
		this.setAttr('id', id);
	}

	/** #sanitized */
	get sanitized() {
		return this.#sanitized;
	}

	/** #quoteBalance */
	get quoteBalance() {
		return this.#quoteBalance;
	}

	/**
	 * 从`this.#attr`更新`childNodes`
	 * @complexity `n`
	 */
	#updateFromAttr() {
		let equal = '=';
		const ParameterToken = require('./parameter'),
			TranscludeToken = require('./transclude');
		const /** @type {ParameterToken & {parentNode: TranscludeToken}} */ parent = this.closest('ext, parameter');
		if (parent instanceof ParameterToken && parent.anon && parent.parentNode?.isTemplate()) {
			equal = '{{=}}';
		}
		return [...this.#attr].map(([k, v]) => {
			if (v === true) {
				return k;
			}
			const quote = v.includes('"') ? "'" : '"';
			return `${k}${equal}${quote}${v}${quote}`;
		}).join(' ');
	}

	/**
	 * 清理标签属性
	 * @complexity `n`
	 */
	sanitize() {
		if (!Parser.running && !this.#sanitized) {
			Parser.warn(`${this.constructor.name}.sanitize 方法将清理无效属性！`);
		}
		const token = Parser.parse(this.#updateFromAttr(), false, stages[this.type], this.getAttribute('config'));
		Parser.run(() => {
			this.replaceChildren(...token.childNodes, true);
		});
		this.#sanitized = true;
		this.#quoteBalance = true;
	}

	/**
	 * 从`childNodes`更新`this.#attr`
	 * @complexity `n`
	 */
	#parseAttr() {
		this.#attr.clear();
		let string = this.toString('comment, include, noinclude, heading, html'),
			token;
		if (this.type !== 'ext-attr' && !Parser.running) {
			const config = this.getAttribute('config'),
				include = this.getAttribute('include');
			token = Parser.run(() => {
				const newToken = new Token(string, config),
					parseOnce = newToken.getAttribute('parseOnce');
				parseOnce(0, include);
				return parseOnce();
			});
			string = String(token);
		}
		string = removeComment(string).replaceAll(/\0\d+~\x7F/gu, '=');

		/**
		 * 解析并重建标签属性
		 * @param {string|boolean} str 半解析的标签属性文本
		 */
		const build = str =>
			typeof str === 'boolean' || !token ? str : token.getAttribute('buildFromStr')(str).map(String).join('');
		for (const [, key, quoteStart, quoted, quoteEnd, unquoted] of string
			.matchAll(/([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(\2|$)|(\S*)))?/gsu)
		) {
			if (!this.setAttr(build(key), build(quoted ?? unquoted ?? true), true)) {
				this.#sanitized = false;
			} else if (quoteStart !== quoteEnd) {
				this.#quoteBalance = false;
			}
		}
	}

	/**
	 * @param {string} attr 标签属性
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type 标签类型
	 * @param {string} name 标签名
	 * @param {accum} accum
	 */
	constructor(attr, type, name, config = Parser.getConfig(), accum = []) {
		super(attr, config, true, accum, {[`Stage-${stages[type]}`]: ':'});
		this.type = type;
		this.setAttribute('name', name).#parseAttr();
	}

	/**
	 * 获取标签属性
	 * @template {string|undefined} T
	 * @param {T} key 属性键
	 * @returns {T extends string ? string|true : Record<string, string|true>}
	 */
	getAttr(key) {
		if (key === undefined) {
			return Object.fromEntries(this.#attr);
		}
		return typeof key === 'string' ? this.#attr.get(key.toLowerCase().trim()) : this.typeError('getAttr', 'String');
	}

	/**
	 * 设置标签属性
	 * @param {string} key 属性键
	 * @param {string|boolean} value 属性值
	 * @param {boolean} init 是否是初次解析
	 * @complexity `n`
	 * @throws `RangeError` 扩展标签属性不能包含">"
	 * @throws `RangeError` 无效的属性名
	 */
	setAttr(key, value, init) {
		init &&= !externalUse('setAttr');
		if (typeof key !== 'string' || typeof value !== 'string' && typeof value !== 'boolean') {
			this.typeError('setAttr', 'String', 'Boolean');
		} else if (!init && this.type === 'ext-attr' && typeof value === 'string' && value.includes('>')) {
			throw new RangeError('扩展标签属性不能包含 ">"！');
		}
		key = key.toLowerCase().trim();
		const config = this.getAttribute('config'),
			include = this.getAttribute('include'),
			parsedKey = this.type === 'ext-attr' || init
				? key
				: Parser.run(() => {
					const token = new Token(key, config),
						parseOnce = token.getAttribute('parseOnce');
					parseOnce(0, include);
					return String(parseOnce());
				});
		if (!/^(?:[\w:]|\0\d+[t!~{}+-]\x7F)(?:[\w:.-]|\0\d+[t!~{}+-]\x7F)*$/u.test(parsedKey)) {
			if (init) {
				return false;
			}
			throw new RangeError(`无效的属性名：${key}！`);
		} else if (value === false) {
			this.#attr.delete(key);
		} else {
			this.#attr.set(key, value === true ? true : value.replaceAll(/\s/gu, ' ').trim());
		}
		if (!init) {
			this.sanitize();
		}
		return true;
	}

	/**
	 * @override
	 * @this {AttributeToken & {parentNode: HtmlToken}}
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const HtmlToken = require('./html');
		const errors = super.lint(start);
		let /** @type {{top: number, left: number}} */ rect;
		if (this.type === 'html-attr' && this.parentNode.closing && this.text().trim()) {
			rect = this.getRootNode().posFromIndex(start);
			errors.push(generateForSelf(this, rect, '位于闭合标签的属性'));
		}
		if (!this.#sanitized) {
			rect ||= this.getRootNode().posFromIndex(start);
			errors.push(generateForSelf(this, rect, '包含无效属性'));
		} else if (!this.#quoteBalance) {
			rect ||= this.getRootNode().posFromIndex(start);
			errors.push(generateForSelf(this, rect, '未闭合的引号', 'warning'));
		}
		return errors;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new AttributeToken(undefined, this.type, this.name, this.getAttribute('config'));
			token.append(...cloned);
			return token.afterBuild();
		});
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'matchesAttr') {
			return this.#matchesAttr;
		}
		return key === 'attr' ? new Map(this.#attr) : super.getAttribute(key);
	}

	/** @override */
	afterBuild() {
		if (this.type !== 'ext-attr') {
			const buildFromStr = this.getAttribute('buildFromStr');
			for (let [key, text] of this.#attr) {
				let built = false;
				if (key.includes('\0')) {
					this.#attr.delete(key);
					key = buildFromStr(key).map(String).join('');
					built = true;
				}
				if (typeof text === 'string' && text.includes('\0')) {
					text = buildFromStr(text).map(String).join('');
					built = true;
				}
				if (built) {
					this.#attr.set(key, text);
				}
			}
		}
		const /** @type {AstListener} */ attributeListener = ({type, target}) => {
			if (type === 'text' || target !== this) {
				this.#parseAttr();
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], attributeListener);
		return this;
	}

	/**
	 * 标签是否具有某属性
	 * @param {string} key 属性键
	 */
	hasAttr(key) {
		return typeof key === 'string' ? this.#attr.has(key.toLowerCase().trim()) : this.typeError('hasAttr', 'String');
	}

	/** 获取全部的标签属性名 */
	getAttrNames() {
		return [...this.#attr.keys()];
	}

	/** 标签是否具有任意属性 */
	hasAttrs() {
		return this.getAttrNames().length > 0;
	}

	/**
	 * 移除标签属性
	 * @param {string} key 属性键
	 * @complexity `n`
	 */
	removeAttr(key) {
		if (typeof key !== 'string') {
			this.typeError('removeAttr', 'String');
		}
		key = key.toLowerCase().trim();
		if (this.#attr.delete(key)) {
			this.sanitize();
		}
	}

	/**
	 * 开关标签属性
	 * @param {string} key 属性键
	 * @param {boolean|undefined} force 强制开启或关闭
	 * @complexity `n`
	 * @throws `RangeError` 不为Boolean类型的属性值
	 */
	toggleAttr(key, force) {
		if (typeof key !== 'string') {
			this.typeError('toggleAttr', 'String');
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

	/**
	 * 生成引导空格
	 * @param {string} str 属性字符串
	 */
	#leadingSpace(str = super.toString()) {
		return this.type !== 'table-attr' && str && str.trimStart() === str ? ' ' : '';
	}

	/**
	 * @override
	 * @this {AttributeToken & Token}
	 * @param {string} selector
	 */
	toString(selector) {
		if (this.type === 'table-attr') {
			normalizeSpace(this);
		}
		const str = super.toString(selector);
		return `${this.#leadingSpace(str)}${str}`;
	}

	/** @override */
	getPadding() {
		return this.#leadingSpace().length;
	}

	/** @override */
	text() {
		if (this.type === 'table-attr') {
			normalizeSpace(this);
		}
		const str = this.#updateFromAttr();
		return `${this.#leadingSpace(str)}${str}`;
	}

	/**
	 * @override
	 * @param {number} i 移除位置
	 * @param {boolean} done 是否已解析过改变后的标签属性
	 * @complexity `n`
	 */
	removeAt(i, done) {
		done &&= !externalUse('removeAt');
		done ||= Parser.running;
		const token = super.removeAt(i);
		if (!done) {
			this.#parseAttr();
		}
		return token;
	}

	/**
	 * @override
	 * @template {Token} T
	 * @param {T} token 待插入的节点
	 * @param {number} i 插入位置
	 * @param {boolean} done 是否已解析过改变后的标签属性
	 * @complexity `n`
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

	/**
	 * @override
	 * @param {...Token} elements 待替换的子节点
	 * @complexity `n²`
	 */
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
}

Parser.classes.AttributeToken = __filename;
module.exports = AttributeToken;
