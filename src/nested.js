'use strict';
const lint_1 = require('../util/lint');
const {generateForChild} = lint_1;
const Parser = require('../index');
const Token = require('.');
const ExtToken = require('./tagPair/ext');
const NoincludeToken = require('./nowiki/noinclude');
const CommentToken = require('./nowiki/comment');

/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: ...ExtToken|NoincludeToken|CommentToken}`
 */
class NestedToken extends Token {
	/** @browser */
	type = 'ext-inner';
	#tags;
	#regex;

	/**
	 * @browser
	 * @param regex 内层正则
	 * @param tags 内层标签名
	 */
	constructor(wikitext, regex, tags, config = Parser.getConfig(), accum = []) {
		const text = wikitext?.replace(regex, (comment, name, attr, inner, closing) => {
			const str = `\0${accum.length + 1}${name ? 'e' : 'c'}\x7F`;
			if (name) {
				new ExtToken(name, attr, inner, closing, config, accum);
			} else {
				const closed = comment.endsWith('-->');
				new CommentToken(comment.slice(4, closed ? -3 : undefined), closed, config, accum);
			}
			return str;
		})?.replace(/(?<=^|\0\d+[ce]\x7F)[^\0]+(?=$|\0\d+[ce]\x7F)/gu, substr => {
			new NoincludeToken(substr, config, accum);
			return `\0${accum.length}c\x7F`;
		});
		super(text, config, true, accum, {
			NoincludeToken: ':', ExtToken: ':',
		});
		this.#tags = tags;
		this.#regex = regex;
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		let rect;
		return [
			...super.lint(start),
			...this.childNodes.filter(child => {
				if (child.type === 'ext' || child.type === 'comment') {
					return false;
				}
				const str = String(child).trim();
				return str && !/^<!--.*-->$/su.test(str);
			}).map(child => {
				rect ??= {start, ...this.getRootNode().posFromIndex(start)};
				return generateForChild(child, rect, Parser.msg('invalid content in <$1>', this.name));
			}),
		];
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	insertAt(token, i = this.length) {
		return typeof token !== 'string' && token.type === 'ext' && !this.#tags.includes(token.name)
			? this.typeError(`${this.constructor.name}只能以${this.#tags.join('或')}标签作为子节点！`)
			: super.insertAt(token, i);
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new NestedToken(undefined, this.#regex, this.#tags, config);
			token.append(...cloned);
			return token;
		});
	}
}
Parser.classes.NestedToken = __filename;
module.exports = NestedToken;
