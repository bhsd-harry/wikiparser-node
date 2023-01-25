'use strict';

const {generateForSelf} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.'),
	AttributeToken = require('./attribute');

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: ...AstText|ArgToken|TranscludeToken|AttributeToken}`
 */
class AttributesToken extends Token {
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
		});
		this.type = type;
		this.setAttribute('name', name);
		if (attr) {
			const regex = new RegExp(
				'((?!\0\\d+c\x7F)[^\\s/](?:(?!\0\\d+~\x7F)[^\\s/=])*)' // 属性名
				+ '(?:'
				+ '((?:\\s|\0\\d+c\x7F)*' // `=`前的空白字符
				+ '(?:=|\0\\d+~\x7F)' // `=`
				+ '(?:\\s|\0\\d+c\x7F)*)' // `=`后的空白字符
				+ `(?:(["'])(.*?)(\\3|$)|(\\S*))` // 属性值
				+ ')?',
				'gsu',
			);
			attr = attr.replace(regex, (full, key, equal, quoteStart, quoted, quoteEnd, unquoted) => {
				if (/^(?:[\w:]|\0\d+[t!~{}+-]\x7F)(?:[\w:.-]|\0\d+[t!~{}+-]\x7F)*$/u.test(key)) {
					const quotes = [quoteStart, quoteEnd];
					new AttributeToken(type.slice(0, -1), key, equal, quoted ?? unquoted, quotes, config, accum);
					return `\0${accum.length - (type === 'ext-attrs' ? 0 : 1)}a\x7F`;
				}
				return full;
			});
			this.insertAt(attr);
		}
	}

	/**
	 * 所有无效属性
	 * @returns {(AstText|Token)[]}
	 */
	getDirtyAttrs() {
		const AstText = require('../lib/text');
		const unexpected = new Set(['ext', 'arg', 'magic-word', 'template', 'heading', 'html']),
			/** @type {{childNodes: AstText[]}} */ {childNodes} = this;
		return childNodes.filter(({type, data}) => type === 'text' && data.trim() || unexpected.has(type));
	}

	/**
	 * 所有指定属性名的AttributeToken
	 * @param {string} key 属性名
	 * @returns {AttributeToken[]}
	 */
	getAttrTokens(key) {
		return this.childNodes.filter(
			child => child instanceof AttributeToken && child.name === key.toLowerCase().trim(),
		);
	}

	/**
	 * 制定属性名的最后一个AttributeToken
	 * @param {string} key 属性名
	 */
	getAttrToken(key) {
		const tokens = this.getAttrTokens(key);
		return tokens[tokens.length - 1];
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
		const errors = super.lint(start);
		let refError;
		if (this.type === 'html-attrs' && this.parentNode.closing && this.text().trim()) {
			refError = generateForSelf(this, {start}, '位于闭合标签的属性');
			errors.push(refError);
		}
		if (!this.sanitized) {
			refError ||= generateForSelf(this, {start}, '');
			refError.message = '包含无效属性';
			const {childNodes} = this;
			for (const attr of this.getDirtyAttrs()) {
				const index = childNodes.indexOf(attr);
				errors.push({...refError, excerpt: childNodes.slice(index).map(String).join('').slice(0, 50)});
			}
		}
		return errors;
	}
}

module.exports = AttributesToken;
