'use strict';

const {generateForSelf, generateForChild} = require('../util/lint'),
	{removeComment} = require('../util/string'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom'),
	AttributeToken = require('./attribute');

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: ...AtomToken|AttributeToken}`
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
		return this;
	}

	/**
	 * 所有无效属性
	 * @returns {AtomToken[]}
	 */
	getDirtyAttrs() {
		return this.childNodes.filter(child => child instanceof AtomToken && child.text().trim());
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
		const errors = super.lint(start);
		let rect;
		if (this.parentNode.closing && this.text().trim()) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForSelf(this, rect, '位于闭合标签的属性'));
		}
		if (!this.sanitized) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			const {childNodes} = this;
			for (const attr of this.getDirtyAttrs()) {
				const index = childNodes.indexOf(attr),
					error = generateForChild(attr, rect, '包含无效属性');
				errors.push({...error, excerpt: childNodes.slice(index).map(String).join('').slice(0, 50)});
			}
		}
		return errors;
	}
}

module.exports = AttributesToken;
