'use strict';

const {generateForChild} = require('../util/lint'),
	{noWrap, removeComment} = require('../util/string'),
	fixedToken = require('../mixin/fixedToken'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

const stages = {'ext-attr': 0, 'html-attr': 2, 'table-attr': 3},
	pre = {'ext-attr': '<pre ', 'html-attr': '<p ', 'table-attr': '{|'},
	post = {'ext-attr': '/>', 'html-attr': '>', 'table-attr': ''},
	commonHtmlAttrs = new Set([
		'id',
		'class',
		'style',
		'lang',
		'dir',
		'title',
		'tabindex',
		'aria-describedby',
		'aria-flowto',
		'aria-hidden',
		'aria-label',
		'aria-labelledby',
		'aria-owns',
		'role',
		'about',
		'property',
		'resource',
		'datatype',
		'typeof',
		'itemid',
		'itemprop',
		'itemref',
		'itemscope',
		'itemtype',
	]),
	blockAttrs = new Set(['align']),
	citeAttrs = new Set(['cite']),
	citeAndAttrs = new Set(['cite', 'datetime']),
	widthAttrs = new Set(['width']),
	tdAttrs = new Set(
		['align', 'valign', 'abbr', 'axis', 'headers', 'scope', 'rowspan', 'colspan', 'width', 'height', 'bgcolor'],
	),
	typeAttrs = new Set(['type']),
	htmlAttrs = {
		div: blockAttrs,
		h1: blockAttrs,
		h2: blockAttrs,
		h3: blockAttrs,
		h4: blockAttrs,
		h5: blockAttrs,
		h6: blockAttrs,
		blockquote: citeAttrs,
		q: citeAttrs,
		p: blockAttrs,
		br: new Set(['clear']),
		pre: widthAttrs,
		ins: citeAndAttrs,
		del: citeAndAttrs,
		ul: typeAttrs,
		ol: new Set(['type', 'start', 'reversed']),
		li: new Set(['type', 'value']),
		table: new Set(
			['summary', 'width', 'border', 'frame', 'rules', 'cellspacing', 'cellpadding', 'align', 'bgcolor'],
		),
		caption: blockAttrs,
		tr: new Set(['bgcolor', 'align', 'valign']),
		td: tdAttrs,
		th: tdAttrs,
		img: new Set(['alt', 'src', 'width', 'height', 'srcset']),
		font: new Set(['size', 'color', 'face']),
		hr: widthAttrs,
		rt: new Set(['rbspan']),
		data: new Set(['value']),
		time: new Set(['datetime']),
		meta: new Set(['itemprop', 'content']),
		link: new Set(['itemprop', 'href', 'title']),
		gallery: new Set(['mode', 'showfilename', 'caption', 'perrow', 'widths', 'heights', 'showthumbnails', 'type']),
		poem: new Set(['compact', 'align']),
		categorytree: new Set(['align', 'hideroot', 'onlyroot', 'depth', 'mode', 'hideprefix']),
		combooption: new Set(['name', 'for', 'inline', 'align']),
	},
	empty = new Set(),
	extAttrs = {
		nowiki: empty,
		indicator: new Set(['name']),
		langconvert: new Set(['from', 'to']),
		ref: new Set(['group', 'name', 'extends', 'follow', 'dir']),
		references: new Set(['group', 'responsive']),
		charinsert: new Set(['label']),
		choose: new Set(['uncached', 'before', 'after']),
		option: new Set(['weight']),
		imagemap: empty,
		inputbox: empty,
		templatestyles: new Set(['src', 'wrapper']),
		dynamicpagelist: empty,
		poll: new Set(['id', 'show-results-before-voting']),
		sm2: typeAttrs,
		flashmp3: typeAttrs,
		score: new Set([
			'line_width_inches',
			'lang',
			'override_midi',
			'raw',
			'note-language',
			'override_audio',
			'override_ogg',
			'sound',
			'vorbis',
		]),
		seo: new Set([
			'title',
			'title_mode',
			'title_separator',
			'keywords',
			'description',
			'robots',
			'google_bot',
			'image',
			'image_width',
			'image_height',
			'image_alt',
			'type',
			'site_name',
			'locale',
			'section',
			'author',
			'published_time',
			'twitter_site',
		]),
		tab: new Set([
			'nested',
			'name',
			'index',
			'class',
			'block',
			'inline',
			'openname',
			'closename',
			'collapsed',
			'dropdown',
			'style',
			'bgcolor',
			'container',
			'id',
			'title',
		]),
		tabs: new Set(['plain', 'class', 'container', 'id', 'title', 'style']),
		combobox: new Set(['placeholder', 'value', 'id', 'class', 'text', 'dropdown', 'style']),
	},
	insecureStyle = new RegExp(
		`${
			'expression'
		}|${
			'(?:filter|accelerator|-o-link(?:-source)?|-o-replace)\\s*:'
		}|${
			'(?:url|image(?:-set)?)\\s*\\('
		}|${
			'attr\\s*\\([^)]+[\\s,]url'
		}`,
		'u',
	);

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
	 * @param {string} value 属性值
	 * @param {string[]} quotes 引号
	 * @param {accum} accum
	 */
	constructor(type, key, equal = '', value = '', quotes = [], config = Parser.getConfig(), accum = []) {
		const keyToken = new AtomToken(key, 'attr-key', config, accum, {
				AstText: ':', ArgToken: ':', TranscludeToken: ':',
			}),
			valueToken = key === 'title'
				? new Token(value, config, true, accum, {
					[`Stage-${stages[type]}`]: ':', ConverterToken: ':',
				}).setAttribute('type', 'attr-value').setAttribute('stage', Parser.MAX_STAGE - 1)
				: new AtomToken(value, 'attr-value', config, accum, {
					[`Stage-${stages[type]}`]: ':',
				});
		super(undefined, config, true, accum);
		this.type = type;
		this.append(keyToken, valueToken);
		this.#equal = equal;
		this.#quotes = quotes;
		this.setAttribute('name', removeComment(key).trim().toLowerCase());
	}

	/** @override */
	afterBuild() {
		if (this.#equal.includes('\0')) {
			this.#equal = this.getAttribute('buildFromStr')(this.#equal, 'string');
		}
		this.setAttribute('name', this.firstChild.text().trim().toLowerCase());
	}

	/**
	 * @override
	 * @param {string} selector
	 * @returns {string}
	 */
	toString(selector) {
		if (selector && this.matches(selector)) {
			return '';
		}
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
		const errors = super.lint(start),
			{balanced, firstChild, lastChild, type, name, parentNode, value} = this,
			tagName = parentNode?.name;
		let rect;
		if (!balanced) {
			const root = this.getRootNode();
			rect = {start, ...root.posFromIndex(start)};
			const e = generateForChild(lastChild, rect, '未闭合的引号', 'warning'),
				startIndex = e.startIndex - 1,
				startCol = e.startCol - 1;
			errors.push({...e, startIndex, startCol, excerpt: String(root).slice(startIndex, startIndex + 50)});
		}
		if (!/\{\{[^{]+\}\}/u.test(name) && (
			type === 'ext-attr' && !(tagName in htmlAttrs) && extAttrs[tagName] && !extAttrs[tagName].has(name)
			|| (type === 'html-attr' || type === 'table-attr' || tagName in htmlAttrs) && !htmlAttrs[tagName]?.has(name)
			&& !/^(?:xmlns:[\w:.-]+|data-[^:]*)$/u.test(name)
			&& (tagName === 'meta' || tagName === 'link' || !commonHtmlAttrs.has(name))
		)) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(firstChild, rect, '非法的属性名'));
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(lastChild, rect, '不安全的样式'));
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

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'equal') {
			return this.#equal;
		}
		return key === 'quotes' ? this.#quotes : super.getAttribute(key);
	}

	/** @override */
	cloneNode() {
		const [key, value] = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new AttributeToken(this.type, '', this.#equal, '', this.#quotes, config);
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			token.afterBuild();
			return token;
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
		if (attrsLength !== 1 || firstChild.type !== this.type || firstChild.name !== key) {
			throw new SyntaxError(`非法的标签属性：${noWrap(value)}`);
		}
		const {lastChild} = firstChild;
		firstChild.destroy(true);
		this.lastChild.safeReplaceWith(lastChild);
		if (this.#quotes[0]) {
			this.close();
		} else {
			this.#quotes = ['"', '"'];
		}
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
		if (attrsLength !== 1 || attr.type !== this.type || attr.value !== true) {
			throw new SyntaxError(`非法的标签属性名：${noWrap(key)}`);
		}
		const {firstChild} = attr;
		attr.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}
}

Parser.classes.AttributeToken = __filename;
module.exports = AttributeToken;
