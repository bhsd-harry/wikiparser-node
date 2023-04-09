'use strict';

const {generateForSelf} = require('../util/lint'),
	{noWrap} = require('../util/string'),
	fixedToken = require('../mixin/fixedToken'),
	attributesParent = require('../mixin/attributesParent'),
	Parser = require('..'),
	Token = require('.');

const magicWords = new Set(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']);

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
class HtmlToken extends attributesParent(fixedToken(Token)) {
	/** @type {'html'} */ type = 'html';
	#closing;
	#selfClosing;
	#tag;

	/** getter */
	get closing() {
		return this.#closing;
	}

	/** @throws `Error` 自闭合标签或空标签 */
	set closing(value) {
		if (!value) {
			this.#closing = false;
			return;
		} else if (this.#selfClosing) {
			throw new Error('这是一个自闭合标签！');
		}
		const {html: [,, tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error('这是一个空标签！');
		}
		this.#closing = true;
	}

	/** getter */
	get selfClosing() {
		return this.#selfClosing;
	}

	/** @throws `Error` 闭合标签或无效自闭合标签 */
	set selfClosing(value) {
		if (!value) {
			this.#selfClosing = false;
			return;
		} else if (this.#closing) {
			throw new Error('这是一个闭合标签！');
		}
		const {html: [tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error(`<${this.name}>标签自闭合无效！`);
		}
		this.#selfClosing = true;
	}

	/**
	 * @param {string} name 标签名
	 * @param {import('./attributes')} attr 标签属性
	 * @param {boolean} closing 是否闭合
	 * @param {boolean} selfClosing 是否自封闭
	 * @param {import('../typings/token').accum} accum
	 */
	constructor(name, attr, closing, selfClosing, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.insertAt(attr);
		this.setAttribute('name', name.toLowerCase());
		this.#closing = closing;
		this.#selfClosing = selfClosing;
		this.#tag = name;
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return selector && this.matches(selector)
			? ''
			: `<${this.#closing ? '/' : ''}${this.#tag}${super.toString(selector)}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @override */
	text() {
		return `<${this.#closing ? '/' : ''}${this.#tag}${
			this.#closing ? '' : super.text()
		}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @override */
	getPadding() {
		return this.#tag.length + (this.#closing ? 2 : 1);
	}

	/** @override */
	print() {
		return super.print({
			pre: `&lt;${this.#closing ? '/' : ''}${this.#tag}`,
			post: `${this.#selfClosing ? '/' : ''}&gt;`,
		});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start);
		let wikitext, /** @type {import('../typings/token').LintError} */ refError;
		if (this.name === 'h1' && !this.#closing) {
			wikitext = String(this.getRootNode());
			refError = generateForSelf(this, {start}, '<h1>');
			errors.push({...refError, excerpt: wikitext.slice(start, start + 50)});
		}
		if (this.closest('table-attrs')) {
			wikitext ||= String(this.getRootNode());
			refError ||= generateForSelf(this, {start}, '');
			const excerpt = wikitext.slice(Math.max(0, start - 25), start + 25);
			errors.push({...refError, message: Parser.msg('HTML tag in table attributes'), excerpt});
		}
		try {
			this.findMatchingTag();
		} catch ({message: errorMsg}) {
			wikitext ||= String(this.getRootNode());
			refError ||= generateForSelf(this, {start}, '');
			const [msg] = errorMsg.split(':'),
				error = {...refError, message: Parser.msg(msg)};
			if (msg === 'unclosed tag') {
				error.severity = 'warning';
				error.excerpt = wikitext.slice(start, start + 50);
			} else if (msg === 'unmatched closing tag') {
				const end = start + String(this).length;
				error.excerpt = wikitext.slice(Math.max(0, end - 50), end);
				if (magicWords.has(this.closest('magic-word')?.name)) {
					error.severity = 'warning';
				}
			}
			errors.push(error);
		}
		return errors;
	}

	/**
	 * 搜索匹配的标签
	 * @complexity `n`
	 * @throws `SyntaxError` 同时闭合和自封闭的标签
	 * @throws `SyntaxError` 无效自封闭标签
	 * @throws `SyntaxError` 未闭合的标签
	 */
	findMatchingTag() {
		const {html} = this.getAttribute('config'),
			{name: tagName, parentNode} = this,
			string = noWrap(String(this));
		if (this.#closing && (this.#selfClosing || html[2].includes(tagName))) {
			throw new SyntaxError(`tag that is both closing and self-closing: ${string}`);
		} else if (html[2].includes(tagName) || this.#selfClosing && html[1].includes(tagName)) { // 自封闭标签
			return this;
		} else if (this.#selfClosing && html[0].includes(tagName)) {
			throw new SyntaxError(`invalid self-closing tag: ${string}`);
		} else if (!parentNode) {
			return undefined;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			siblings = this.#closing
				? childNodes.slice(0, i).reverse().filter(({type, name}) => type === 'html' && name === tagName)
				: childNodes.slice(i + 1).filter(({type, name}) => type === 'html' && name === tagName);
		let imbalance = this.#closing ? -1 : 1;
		for (const token of siblings) {
			if (token.closing) {
				imbalance--;
			} else {
				imbalance++;
			}
			if (imbalance === 0) {
				return token;
			}
		}
		throw new SyntaxError(`${this.#closing ? 'unmatched closing' : 'unclosed'} tag: ${string}`);
	}

	/** @override */
	cloneNode() {
		const [attr] = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Parser.run(() => new HtmlToken(this.#tag, attr, this.#closing, this.#selfClosing, config));
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {import('../typings/node').TokenAttribute<T>}
	 */
	getAttribute(key) {
		return key === 'tag' ? this.#tag : super.getAttribute(key);
	}

	/**
	 * 更换标签名
	 * @param {string} tag 标签名
	 * @throws `RangeError` 非法的HTML标签
	 */
	replaceTag(tag) {
		const name = tag.toLowerCase();
		if (!this.getAttribute('config').html.flat().includes(name)) {
			throw new RangeError(`非法的HTML标签：${tag}`);
		}
		this.setAttribute('name', name).#tag = tag;
	}

	/** 局部闭合 */
	#localMatch() {
		this.#selfClosing = false;
		const root = Parser.parse(`</${this.name}>`, false, 3, this.getAttribute('config'));
		this.after(root.firstChild);
	}

	/**
	 * 修复无效自封闭标签
	 * @complexity `n`
	 * @throws `Error` 无法修复无效自封闭标签
	 */
	fix() {
		const config = this.getAttribute('config'),
			{parentNode, name: tagName, firstChild} = this;
		if (!parentNode || !this.#selfClosing || !config.html[0].includes(tagName)) {
			return;
		} else if (firstChild.text().trim()) {
			this.#localMatch();
			return;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			/** @type {HtmlToken[]} */
			prevSiblings = childNodes.slice(0, i).filter(({type, name}) => type === 'html' && name === tagName),
			imbalance = prevSiblings.reduce((acc, {closing}) => acc + (closing ? 1 : -1), 0);
		if (imbalance < 0) {
			this.#selfClosing = false;
			this.#closing = true;
		} else {
			Parser.warn('无法修复无效自封闭标签', noWrap(String(this)));
			throw new Error(`无法修复无效自封闭标签：前文共有 ${imbalance} 个未匹配的闭合标签`);
		}
	}
}

Parser.classes.HtmlToken = __filename;
module.exports = HtmlToken;
