'use strict';
const lint_1 = require('../../util/lint');
const {generateForChild} = lint_1;
const string_1 = require('../../util/string');
const {noWrap} = string_1;
const debug_1 = require('../../util/debug');
const {undo} = debug_1;
const Parser = require('../../index');
const Token = require('..');
const AtomToken = require('../atom');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ...Token]}`
 */
class LinkBaseToken extends Token {
	#bracket = true;
	#delimiter;
	#fragment;
	#encoded = false;

	/** 完整链接 */
	get link() {
		return this.#getTitle();
	}

	set link(link) {
		this.setTarget(link);
	}

	/** fragment */
	get fragment() {
		return this.#getTitle().fragment;
	}

	/** 链接显示文字 */
	get innerText() {
		if (this.type === 'link') {
			return this.length > 1
				? this.lastChild.text()
				: this.firstChild.text().replace(/^\s*:/u, '');
		}
		return undefined;
	}

	/**
	 * @browser
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link, linkText, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(undefined, config, true, accum, {
			AtomToken: 0, Token: 1,
		});
		this.insertAt(new AtomToken(link, 'link-target', config, accum, {
			'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
		}));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, true, accum, {
				'Stage-5': ':', ConverterToken: ':',
			});
			inner.type = 'link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
		this.#delimiter = delimiter;
		this.protectChildren(0);
	}

	/** @private */
	afterBuild() {
		const titleObj = this.normalizeTitle(this.firstChild.text(), 0, false, true, true);
		this.setAttribute('name', titleObj.title);
		this.#fragment = titleObj.fragment;
		this.#encoded = titleObj.encoded;
		if (this.#delimiter.includes('\0')) {
			this.#delimiter = this.buildFromStr(this.#delimiter, 'string');
		}
		const /** @implements */ linkListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = prevTarget.text(),
					{title, interwiki, ns, valid, fragment, encoded} = this.normalizeTitle(name, 0, false, true, true);
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的内链目标：${name}`);
				} else if (this.type === 'category' && (interwiki || ns !== 14)
                    || this.type === 'file' && (interwiki || ns !== 6)) {
					undo(e, data);
					throw new Error(`${this.type === 'file' ? '文件' : '分类'}链接不可更改命名空间：${name}`);
				} else if (this.type === 'link' && !interwiki && (ns === 6 || ns === 14)
                    && !name.trim().startsWith(':')) {
					const {firstChild} = prevTarget;
					if (firstChild?.type === 'text') {
						firstChild.insertData(0, ':');
					} else {
						prevTarget.prepend(':');
					}
				}
				this.setAttribute('name', title);
				this.#fragment = fragment;
				this.#encoded = encoded;
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
	}

	/** @private */
	setAttribute(key, value) {
		if (key === 'bracket') {
			this.#bracket = Boolean(value);
			return this;
		}
		return super.setAttribute(key, value);
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		const str = super.toString(selector, this.#delimiter);
		return this.#bracket && !(selector && this.matches(selector)) ? `[[${str}]]` : str;
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		const str = super.text('|');
		return this.#bracket ? `[[${str}]]` : str;
	}

	/** @private */
	getPadding() {
		return 2;
	}

	/** @private */
	getGaps() {
		return this.#delimiter.length;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print(this.#bracket ? {pre: '[[', post: ']]', sep: this.#delimiter} : {sep: this.#delimiter});
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			{childNodes: [target, linkText], type: linkType} = this;
		let rect;
		if (linkType === 'link' && target.childNodes.some(({type}) => type === 'template')) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'template in an internal link target', 'warning'));
		}
		if (this.#encoded) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'unnecessary URL encoding in an internal link'));
		}
		if (linkType === 'link' && linkText?.childNodes?.some(child => child.type === 'text' && child.data.includes('|'))) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(linkText, rect, 'additional "|" in the link text', 'warning'));
		} else if (linkType !== 'link' && this.#fragment !== undefined) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, 'useless fragment'));
		}
		return errors;
	}

	/** 生成Title对象 */
	#getTitle() {
		return this.normalizeTitle(this.firstChild.text(), 0, false, true, true);
	}

	/** @override */
	cloneNode() {
		const [link, ...linkText] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new this.constructor('', undefined, this.getAttribute('config'));
			token.firstChild.safeReplaceWith(link);
			token.append(...linkText);
			token.afterBuild();
			return token;
		});
	}

	/**
	 * 设置链接目标
	 * @param link 链接目标
	 * @throws `SyntaxError` 非法的链接目标
	 */
	setTarget(link) {
		let strLink = String(link);
		if (this.type === 'link' && !/^\s*[:#]/u.test(strLink)) {
			strLink = `:${strLink}`;
		}
		const root = Parser.parse(`[[${strLink}]]`, this.getAttribute('include'), 6, this.getAttribute('config')),
			{length, firstChild: wikiLink} = root;
		if (length !== 1 || wikiLink?.type !== this.type || wikiLink.length !== 1) {
			const msgs = {link: '内链', file: '文件链接', category: '分类'};
			throw new SyntaxError(`非法的${msgs[this.type]}目标：${strLink}`);
		}
		const {firstChild} = wikiLink;
		wikiLink.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置链接显示文字
	 * @param linkStr 链接显示文字
	 * @throws `SyntaxError` 非法的链接显示文字
	 */
	setLinkText(linkStr = '') {
		let lastChild;
		const config = this.getAttribute('config');
		if (linkStr) {
			const root = Parser.parse(`[[${this.type === 'category' ? 'Category:' : ''}L|${linkStr}]]`, this.getAttribute('include'), 6, config),
				{length, firstChild: wikiLink} = root;
			if (length !== 1 || wikiLink?.type !== this.type || wikiLink.length !== 2) {
				throw new SyntaxError(`非法的${this.type === 'link' ? '内链文字' : '分类关键字'}：${noWrap(linkStr)}`);
			}
			({lastChild} = wikiLink);
		} else {
			lastChild = Parser.run(() => new Token('', config));
			lastChild.setAttribute('stage', 7).type = 'link-text';
		}
		if (this.length === 1) {
			this.insertAt(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
	}
}
Parser.classes.LinkBaseToken = __filename;
module.exports = LinkBaseToken;
