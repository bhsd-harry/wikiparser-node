'use strict';

const {generateForSelf, generateForChild} = require('../util/lint'),
	{toCase, normalizeSpace, text, removeComment} = require('../util/string'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom'),
	AttributeToken = require('./attribute');

const stages = {'ext-attrs': 0, 'html-attrs': 2, 'table-attrs': 3};

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: ...AtomToken|AttributeToken}`
 */
class AttributesToken extends Token {
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

	/** getAttrs()方法的getter写法 */
	get attributes() {
		return this.getAttrs();
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

	/** 是否含有无效属性 */
	get sanitized() {
		return this.getDirtyAttrs().length === 0;
	}

	/**
	 * @param {string} attr 标签属性
	 * @param {'ext-attrs'|'html-attrs'|'table-attrs'} type 标签类型
	 * @param {string} name 标签名
	 * @param {accum} accum
	 */
	constructor(attr, type, name, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			AtomToken: ':', AttributeToken: ':',
		});
		this.type = type;
		this.setAttribute('name', name);
		if (attr) {
			const regex = new RegExp(
				`([^\\s/](?:(?!\0\\d+~\x7F)[^\\s/=])*)` // 属性名
				+ '(?:'
				+ '((?:\\s|\0\\d+c\x7F)*' // `=`前的空白字符
				+ '(?:=|\0\\d+~\x7F)' // `=`
				+ '(?:\\s|\0\\d+c\x7F)*)' // `=`后的空白字符
				+ `(?:(["'])(.*?)(\\3|$)|(\\S*))` // 属性值
				+ ')?',
				'gsu',
			);
			let out = '',
				mt = regex.exec(attr),
				lastIndex = 0;
			const insertDirty = /** 插入无效属性 */ () => {
				if (out) {
					super.insertAt(new AtomToken(out, `${type.slice(0, -1)}-dirty`, config, accum, {
						[`Stage-${stages[type]}`]: ':',
					}));
					out = '';
				}
			};
			while (mt) {
				const {index, 0: full, 1: key, 2: equal, 3: quoteStart, 4: quoted, 5: quoteEnd, 6: unquoted} = mt;
				out += attr.slice(lastIndex, index);
				if (/^(?:[\w:]|\0\d+[t!~{}+-]\x7F)(?:[\w:.-]|\0\d+[t!~{}+-]\x7F)*$/u.test(removeComment(key).trim())) {
					const value = quoted ?? unquoted,
						quotes = [quoteStart, quoteEnd],
						token = new AttributeToken(type.slice(0, -1), key, equal, value, quotes, config, accum);
					insertDirty();
					super.insertAt(token);
				} else {
					out += full;
				}
				({lastIndex} = regex);
				mt = regex.exec(attr);
			}
			out += attr.slice(lastIndex);
			insertDirty();
		}
	}

	/**
	 * @override
	 * @this {AttributesToken & {parentNode: TdToken}}
	 */
	afterBuild() {
		const TdToken = require('./table/td');
		if (this.type === 'table-attrs') {
			this.setAttribute('name', this.parentNode?.subtype === 'caption' ? 'caption' : this.parentNode?.type);
		}
	}

	/**
	 * 所有指定属性名的AttributeToken
	 * @param {string} key 属性名
	 * @returns {AttributeToken[]}
	 */
	getAttrTokens(key) {
		return typeof key === 'string'
			? this.childNodes.filter(
				child => child instanceof AttributeToken && child.name === key.toLowerCase().trim(),
			)
			: this.typeError('getAttrTokens', 'String');
	}

	/**
	 * 制定属性名的最后一个AttributeToken
	 * @param {string} key 属性名
	 */
	getAttrToken(key) {
		const tokens = this.getAttrTokens(key);
		return tokens.at(-1);
	}

	/**
	 * 获取标签属性
	 * @param {string} key 属性键
	 */
	getAttr(key) {
		return this.getAttrToken(key)?.getValue();
	}

	/**
	 * @override
	 * @this {AttributesToken & {parentNode: HtmlToken}}
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const HtmlToken = require('./html');
		const errors = super.lint(start),
			{parentNode: {closing}, length, childNodes} = this,
			/** @type {Record<string, AttributeToken[]>} */ attrs = {},
			/** @type {Set<string>} */ duplicated = new Set();
		let rect;
		if (closing && this.text().trim()) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForSelf(this, rect, '位于闭合标签的属性'));
		}
		for (let i = 0; i < length; i++) {
			const /** @type {AtomToken|AttributeToken} */ attr = childNodes[i];
			if (attr instanceof AtomToken && attr.text().trim()) {
				rect ||= {start, ...this.getRootNode().posFromIndex(start)};
				errors.push({
					...generateForChild(attr, rect, '包含无效属性'),
					excerpt: childNodes.slice(i).map(String).join('').slice(0, 50),
				});
			} else if (attr instanceof AttributeToken) {
				const {name} = attr;
				if (name in attrs) {
					duplicated.add(name);
					attrs[name].push(attr);
				} else {
					attrs[name] = [attr];
				}
			}
		}
		if (duplicated.size > 0) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			for (const key of duplicated) {
				errors.push(...attrs[key].map(attr => generateForChild(attr, rect, `重复的${key}属性`)));
			}
		}
		return errors;
	}

	/**
	 * @override
	 * @this {AttributesToken & {parentNode: HtmlToken}}
	 */
	print() {
		const HtmlToken = require('./html');
		return String(this)
			? `<span class="wpb-${this.type}${
				this.parentNode.closing && this.text().trim() ? ' wpb-error' : ''
			}">${this.childNodes.map(child => child.print({
				class: child instanceof AtomToken && child.text().trim() && 'hidden',
			})).join('')}</span>`
			: '';
	}

	/** 清理标签属性 */
	sanitize() {
		const {childNodes, length} = this;
		let dirty = false;
		for (let i = length - 1; i >= 0; i--) {
			const child = childNodes[i];
			if (child instanceof AtomToken && child.text().trim()) {
				dirty = true;
				this.removeAt(i);
			}
		}
		if (!Parser.running && dirty) {
			Parser.warn(`${this.constructor.name}.sanitize 方法将清理无效属性！`);
		}
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new AttributesToken(undefined, this.type, this.name, this.getAttribute('config'));
			token.append(...cloned);
			return token;
		});
	}

	/**
	 * 所有无效属性
	 * @returns {AtomToken[]}
	 */
	getDirtyAttrs() {
		return this.childNodes.filter(child => child instanceof AtomToken && child.text().trim());
	}

	/**
	 * @override
	 * @param {AttributeToken} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @throws `RangeError` 不是AttributeToken
	 */
	insertAt(token, i = this.length) {
		if (!(token instanceof AttributeToken)) {
			throw new RangeError(`${this.constructor.name}只能插入AttributeToken！`);
		} else if (i === this.length) {
			const {lastChild} = this;
			if (lastChild instanceof AttributeToken) {
				lastChild.close();
			}
		} else {
			token.close();
		}
		if (this.closest('parameter')) {
			token.escape();
		}
		super.insertAt(token, i);
		const {previousVisibleSibling, nextVisibleSibling} = token,
			type = `${this.type.slice(0, -1)}-dirty`,
			config = this.getAttribute('config'),
			acceptable = {[`Stage-${stages[this.type]}`]: ':'};
		if (nextVisibleSibling && !/^\s/u.test(String(nextVisibleSibling))) {
			super.insertAt(Parser.run(() => new AtomToken(' ', type, config, [], acceptable)), i + 1);
		}
		if (previousVisibleSibling && !/\s$/u.test(String(previousVisibleSibling))) {
			super.insertAt(Parser.run(() => new AtomToken(' ', type, config, [], acceptable)), i);
		}
		return token;
	}

	/**
	 * 设置标签属性
	 * @param {string} key 属性键
	 * @param {string|boolean} value 属性值
	 * @throws `RangeError` 扩展标签属性不能包含">"
	 * @throws `RangeError` 无效的属性名
	 */
	setAttr(key, value) {
		if (typeof key !== 'string' || typeof value !== 'string' && typeof value !== 'boolean') {
			this.typeError('setAttr', 'String', 'Boolean');
		} else if (this.type === 'ext-attrs' && typeof value === 'string' && value.includes('>')) {
			throw new RangeError('扩展标签属性不能包含 ">"！');
		}
		key = key.toLowerCase().trim();
		const attr = this.getAttrToken(key);
		if (attr) {
			attr.setValue(value);
			return;
		} else if (value === false) {
			return;
		}
		const config = this.getAttribute('config'),
			include = this.getAttribute('include'),
			parsedKey = this.type === 'ext-attrs'
				? key
				: Parser.run(() => {
					const token = new Token(key, config),
						parseOnce = token.getAttribute('parseOnce');
					parseOnce(0, include);
					return String(parseOnce());
				});
		if (!/^(?:[\w:]|\0\d+[t!~{}+-]\x7F)(?:[\w:.-]|\0\d+[t!~{}+-]\x7F)*$/u.test(parsedKey)) {
			throw new RangeError(`无效的属性名：${key}！`);
		}
		const newAttr = Parser.run(() => new AttributeToken(
			this.type.slice(0, -1), key, value === true ? '' : '=', value, ['"', '"'], config,
		));
		this.insertAt(newAttr);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		return key === 'matchesAttr' ? this.#matchesAttr : super.getAttribute(key);
	}

	/**
	 * 标签是否具有某属性
	 * @param {string} key 属性键
	 */
	hasAttr(key) {
		return typeof key === 'string'
			? this.getAttrTokens(key).length > 0
			: this.typeError('hasAttr', 'String');
	}

	/** 获取全部的标签属性名 */
	getAttrNames() {
		return new Set(this.childNodes.filter(child => child instanceof AttributeToken).map(({name}) => name));
	}

	/** 标签是否具有任意属性 */
	hasAttrs() {
		return this.getAttrNames().size > 0;
	}

	/** 获取全部标签属性 */
	getAttrs() {
		const /** @type {AttributeToken[]} */ attrs = this.childNodes.filter(child => child instanceof AttributeToken);
		return Object.fromEntries(attrs.map(({name, value}) => [name, value]));
	}

	/**
	 * 移除标签属性
	 * @param {string} key 属性键
	 */
	removeAttr(key) {
		for (const attr of this.getAttrTokens(key)) {
			attr.remove();
		}
	}

	/**
	 * 开关标签属性
	 * @param {string} key 属性键
	 * @param {boolean|undefined} force 强制开启或关闭
	 * @throws `RangeError` 不为Boolean类型的属性值
	 */
	toggleAttr(key, force) {
		if (typeof key !== 'string') {
			this.typeError('toggleAttr', 'String');
		} else if (force !== undefined) {
			force = Boolean(force);
		}
		key = key.toLowerCase().trim();
		const attr = this.getAttrToken(key);
		if (attr && attr.getValue() !== true) {
			throw new RangeError(`${key} 属性的值不为 Boolean！`);
		} else if (attr) {
			attr.setValue(force === true);
		} else if (force !== false) {
			this.setAttr(key, true);
		}
	}

	/**
	 * 生成引导空格
	 * @param {string} str 属性字符串
	 */
	#leadingSpace(str = super.toString()) {
		const {type} = this,
			leadingRegex = {'ext-attrs': /^\s/u, 'html-attrs': /^[/\s]/u};
		return str && type !== 'table-attrs' && !leadingRegex[type].test(str) ? ' ' : '';
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		if (this.type === 'table-attrs') {
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
		if (this.type === 'table-attrs') {
			normalizeSpace(this);
		}
		const str = text(this.childNodes.filter(child => child instanceof AttributeToken), ' ');
		return `${this.#leadingSpace(str)}${str}`;
	}
}

Parser.classes.AttributesToken = __filename;
module.exports = AttributesToken;
