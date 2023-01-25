'use strict';

const {generateForChild} = require('../util/lint'),
	{noWrap} = require('../util/string'),
	fixedToken = require('../mixin/fixedToken'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

const stages = {'ext-attr': 0, 'html-attr': 2, 'table-attr': 3},
	pre = {'ext-attr': '<pre ', 'html-attr': '<p ', 'table-attr': '{|'},
	post = {'ext-attr': '></pre>', 'html-attr': '>', 'table-attr': ''};

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AtomToken, Token|AtomToken]}`
 */
class AttributeToken extends fixedToken(Token) {
	#equal;
	#quotes;

	/** 引号是否匹配 */
	get balanced() {
		return !this.#equal || this.#quotes[0] === this.#quotes[1];
	}

	/** getValue()的getter */
	get value() {
		return this.getValue();
	}

	set value(value) {
		this.setValue(value);
	}

	/**
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type 标签类型
	 * @param {string} key 属性名
	 * @param {string} equal 等号
	 * @param {string[]} quotes 引号
	 * @param {string} value 属性值
	 * @param {accum} accum
	 */
	constructor(type, key, equal, quotes = [], value = '', config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.type = type;
		this.append(
			new AtomToken(key, `${type}-key`, config, accum, {
				AstText: ':', ArgToken: ':', TranscludeToken: ':',
			}),
			key === 'title'
				? new Token(value, config, true, accum, {
					[`Stage-${stages[type]}`]: ':', ConverterToken: ':',
				}).setAttribute('stage', Parser.MAX_STAGE - 1)
				: new AtomToken(value, `${type}-value`, config, accum, {
					[`Stage-${stages[type]}`]: ':',
				}),
		);
		this.#equal = equal;
		this.#quotes = quotes;
	}

	/** @override */
	afterBuild() {
		if (this.#equal.includes('\0')) {
			this.#equal = String(this.getAttribute('buildFromStr')(this.#equal));
		}
		return this.setAttribute('name', this.firstChild.text().trim());
	}

	/**
	 * @override
	 * @param {string} selector
	 * @returns {string}
	 */
	toString(selector) {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal
			? `${super.toString(selector, `${this.#equal}${quoteStart}`)}${quoteEnd}`
			: this.firstChild.toString(selector);
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		return this.#equal ? `${super.text(`${this.#equal.trim()}"`)}"` : this.firstChild.text();
	}

	/** @override */
	getGaps() {
		return this.#equal ? this.#equal.length + (this.#quotes[0]?.length ?? 0) : 0;
	}

	/** @override */
	print() {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.print({sep: `${this.#equal}${quoteStart}`, post: quoteEnd}) : super.print();
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (!this.balanced) {
			const {lastChild} = this,
				e = generateForChild(lastChild, {token: this, start}, '未闭合的引号', 'warning');
			errors.push({...e, startCol: e.startCol - 1, excerpt: String(lastChild).slice(-50)});
		}
		return errors;
	}

	/** 获取属性值 */
	getValue() {
		if (this.#equal) {
			const value = this.lastChild.text();
			if (this.#quotes[1]) {
				return value;
			}
			return this.#quotes[0] ? value.trimEnd() : value.trim();
		}
		return true;
	}

	/** @override */
	cloneNode() {
		const [key, value] = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new AttributeToken(this.type, '', this.#equal, this.#quotes, '', config);
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			return token.afterBuild();
		});
	}

	/** 转义等号 */
	escape() {
		this.#equal = '{{=}}';
	}

	/** 闭合引号 */
	close() {
		[this.#quotes[1]] = this.#quotes;
	}

	/**
	 * 设置属性值
	 * @param {string|boolean} value 参数值
	 * @throws `SyntaxError` 非法的标签属性
	 */
	setValue(value) {
		if (value === false) {
			this.remove();
			return;
		} else if (value === true) {
			this.#equal = '';
			return;
		}
		value = String(value);
		const {type} = this,
			key = this.name === 'title' ? 'title' : 'data',
			wikitext = `${pre[type]}${key}="${value}"${post[type]}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), stages[type] + 1, this.getAttribute('config')),
			{length, firstChild: tag} = root;
		let attrs;
		if (length !== 1 || tag.type !== type.slice(0, -5)) {
			throw new SyntaxError(`非法的标签属性：${noWrap(value)}`);
		} else if (type === 'table-attr') {
			const {length: tableLength} = tag;
			if (tableLength !== 2) {
				throw new SyntaxError(`非法的标签属性：${noWrap(value)}`);
			}
			attrs = tag.lastChild;
		} else {
			attrs = tag.firstChild;
		}
		const {length: attrsLength, firstChild} = attrs;
		if (attrsLength === 1 && firstChild.type === this.type && firstChild.name === key) {
			const {lastChild} = firstChild;
			firstChild.destroy(true);
			this.lastChild.safeReplaceWith(lastChild);
			this.close();
		}
		throw new SyntaxError(`非法的标签属性：${noWrap(value)}`);
	}

	/**
	 * 修改属性名
	 * @param {string} key 新属性名
	 * @throws `Error` title属性不能更名
	 * @throws `SyntaxError` 非法的模板参数名
	 */
	rename(key) {
		if (this.name === 'title') {
			throw new Error('title 属性不能更名！');
		}
		key = String(key);
		const {type} = this,
			wikitext = `${pre[type]}${key}${post[type]}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), stages[type] + 1, this.getAttribute('config')),
			{length, firstChild: tag} = root;
		let attrs;
		if (length !== 1 || tag.type !== type.slice(0, -5)) {
			throw new SyntaxError(`非法的标签属性名：${noWrap(key)}`);
		} else if (type === 'table-attr') {
			const {length: tableLength} = tag;
			if (tableLength !== 2) {
				throw new SyntaxError(`非法的标签属性名：${noWrap(key)}`);
			}
			attrs = tag.lastChild;
		} else {
			attrs = tag.firstChild;
		}
		const {length: attrsLength, firstChild: attr} = attrs;
		if (attrsLength === 1 && attr.type === this.type && attr.value === true) {
			const {firstChild} = attr;
			attr.destroy(true);
			this.firstChild.safeReplaceWith(firstChild);
		}
		throw new SyntaxError(`非法的标签属性名：${noWrap(key)}`);
	}
}

Parser.classes.AttributeToken = __filename;
module.exports = AttributeToken;
