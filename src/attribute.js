'use strict';

const {generateForChild} = require('../util/lint'),
	{removeComment} = require('../util/string'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

const commonHtmlAttrs = new Set([
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
		categorytree: new Set([
			'align',
			'hideroot',
			'onlyroot',
			'depth',
			'mode',
			'hideprefix',
			'namespaces',
			'showcount',
			'notranslations',
		]),
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
class AttributeToken extends Token {
	#equal;
	#quotes;
	#tag;

	/** 引号是否匹配 */
	get balanced() {
		return !this.#equal || this.#quotes[0] === this.#quotes[1];
	}

	/** getValue()的getter */
	get value() {
		return this.getValue();
	}

	/** 标签名 */
	get tag() {
		return this.#tag;
	}

	/**
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type 标签类型
	 * @param {string} tag 标签名
	 * @param {string} key 属性名
	 * @param {string} equal 等号
	 * @param {string} value 属性值
	 * @param {string[]} quotes 引号
	 * @param {accum} accum
	 */
	constructor(type, tag, key, equal = '', value = '', quotes = [], config = Parser.getConfig(), accum = []) {
		const keyToken = new AtomToken(key, 'attr-key', config, accum, {
		});
		let valueToken;
		if (key === 'title') {
			valueToken = new Token(value, config, true, accum, {
			}).setAttribute('type', 'attr-value').setAttribute('stage', Parser.MAX_STAGE - 1);
		} else if (tag === 'gallery' && key === 'caption') {
			/** @type {ParserConfig} */
			const newConfig = {...config, excludes: [...config.excludes, 'quote', 'extLink', 'magicLink', 'list']};
			valueToken = new Token(value, newConfig, true, accum, {
			}).setAttribute('type', 'attr-value').setAttribute('stage', 5);
		} else if (tag === 'choose' && (key === 'before' || key === 'after')) {
			/** @type {ParserConfig} */
			const newConfig = {...config, excludes: [...config.excludes, 'heading', 'html', 'table', 'hr', 'list']};
			valueToken = new Token(value, newConfig, true, accum, {
			}).setAttribute('type', 'attr-value').setAttribute('stage', 1);
		} else {
			valueToken = new AtomToken(value, 'attr-value', config, accum, {
			});
		}
		super(undefined, config, true, accum);
		this.type = type;
		this.append(keyToken, valueToken);
		this.#equal = equal;
		this.#quotes = quotes;
		this.#tag = tag;
		this.setAttribute('name', removeComment(key).trim().toLowerCase());
	}

	/** @override */
	afterBuild() {
		if (this.#equal.includes('\0')) {
			this.#equal = this.getAttribute('buildFromStr')(this.#equal, 'string');
		}
		if (this.parentNode) {
			this.#tag = this.parentNode.name;
		}
		this.setAttribute('name', this.firstChild.text().trim().toLowerCase());
	}

	/**
	 * @override
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
	lint(start) {
		const errors = super.lint(start),
			{balanced, firstChild, lastChild, type, name, parentNode, value} = this,
			tagName = parentNode?.name;
		let rect;
		if (!balanced) {
			const root = this.getRootNode();
			rect = {start, ...root.posFromIndex(start)};
			const e = generateForChild(lastChild, rect, 'unclosed quotes', 'warning'),
				startIndex = e.startIndex - 1,
				startCol = e.startCol - 1;
			errors.push({...e, startIndex, startCol});
		}
		if (!/\{\{[^{]+\}\}/u.test(name) && (
			type === 'ext-attr' && !(tagName in htmlAttrs) && extAttrs[tagName] && !extAttrs[tagName].has(name)
			|| (type === 'html-attr' || type === 'table-attr' || tagName in htmlAttrs) && !htmlAttrs[tagName]?.has(name)
			&& !/^(?:xmlns:[\w:.-]+|data-[^:]*)$/u.test(name)
			&& (tagName === 'meta' || tagName === 'link' || !commonHtmlAttrs.has(name))
		)) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(firstChild, rect, 'illegal attribute name'));
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(lastChild, rect, 'insecure style'));
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
			return value.trim();
		}
		return true;
	}
}

module.exports = AttributeToken;
