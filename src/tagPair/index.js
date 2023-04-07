'use strict';
const Parser = require('../../index');
const fixed = require('../../mixin/fixed');
const Token = require('..');

/** 成对标签 */
class TagPairToken extends fixed(Token) {
	/** @browser */
	#selfClosing;
	/** @browser */
	#closed;
	/** @browser */
	#tags;

	/**
	 * 是否闭合
	 * @browser
	 */
	get closed() {
		return this.#closed;
	}

	set closed(value) {
		this.#closed ||= value;
	}

	/** 是否自封闭 */
	get selfClosing() {
		return this.#selfClosing;
	}

	set selfClosing(value) {
		if (value !== this.#selfClosing && this.lastChild.text()) {
			Parser.warn(`<${this.name}>标签内部的${value ? '文本将被隐藏' : '原有文本将再次可见'}！`);
		}
		this.#selfClosing = value;
	}

	/** 内部wikitext */
	get innerText() {
		return this.#selfClosing ? undefined : this.lastChild.text();
	}

	/**
	 * @browser
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭；约定`undefined`表示自闭合，`''`表示未闭合
	 */
	constructor(name, attr, inner, closed, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true);
		this.setAttribute('name', name.toLowerCase());
		this.#tags = [name, closed || name]; // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
		this.#selfClosing = closed === undefined;
		this.#closed = closed !== '';
		this.append(attr, inner);
		let index = typeof attr === 'string' ? -1 : accum.indexOf(attr);
		if (index === -1 && typeof inner !== 'string') {
			index = accum.indexOf(inner);
		}
		if (index === -1) {
			index = Infinity;
		}
		accum.splice(index, 0, this);
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		const {firstChild, lastChild, nextSibling, name} = this,
			[opening, closing] = this.#tags;
		if (selector && this.matches(selector)) {
			return '';
		} else if (!this.closed && nextSibling) {
			Parser.error(`自动闭合 <${name}>`, lastChild);
			this.#closed = true;
		}
		return this.#selfClosing
			? `<${opening}${String(firstChild)}/>`
			: `<${opening}${String(firstChild)}>${String(lastChild)}${this.closed ? `</${closing}>` : ''}`;
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		const [opening, closing] = this.#tags;
		return this.#selfClosing
			? `<${opening}${this.firstChild.text()}/>`
			: `<${opening}${super.text('>')}${this.closed ? `</${closing}>` : ''}`;
	}

	/** @private */
	getPadding() {
		return this.#tags[0].length + 1;
	}

	/** @private */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		const [opening, closing] = this.#tags;
		return super.print(this.#selfClosing
			? {pre: `&lt;${opening}`, post: '/&gt;'}
			: {pre: `&lt;${opening}`, sep: '&gt;', post: this.closed ? `&lt;/${closing}&gt;` : ''});
	}

	/** @private */
	getAttribute(key) {
		return key === 'tags' ? [...this.#tags] : super.getAttribute(key);
	}
}
Parser.classes.TagPairToken = __filename;
module.exports = TagPairToken;
