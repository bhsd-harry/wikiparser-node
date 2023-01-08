'use strict';

const {text, noWrap} = require('../util/string'),
	Parser = require('..'),
	Token = require('.');

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, Token, ...HiddenToken]}`
 */
class ArgToken extends Token {
	type = 'arg';

	/**
	 * @param {string[]} parts 以'|'分隔的各部分
	 * @param {accum} accum
	 * @complexity `n`
	 */
	constructor(parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1, HiddenToken: '2:'});
		for (let i = 0; i < parts.length; i++) {
			if (i === 0 || i > 1) {
				const AtomToken = i === 0 ? require('./atom') : require('./atom/hidden');
				const token = new AtomToken(parts[i], i === 0 ? 'arg-name' : undefined, config, accum, {
					'Stage-2': ':', '!HeadingToken': '',
				});
				this.appendChild(token);
			} else {
				const token = new Token(parts[i], config, true, accum);
				token.type = 'arg-default';
				this.appendChild(token.setAttribute('stage', 2));
			}
		}
		this.getAttribute('protectChildren')(0);
	}

	/** @override */
	cloneNode() {
		const [name, ...cloned] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new ArgToken([''], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(name);
			token.append(...cloned);
			return token.afterBuild();
		});
	}

	/** @override */
	afterBuild() {
		this.setAttribute('name', this.firstChild.text().trim());
		const /** @type {AstListener} */ argListener = ({prevTarget}) => {
			if (prevTarget === this.firstChild) {
				this.setAttribute('name', prevTarget.text().trim());
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], argListener);
		return this;
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `{{{${super.toString(selector, '|')}}}}`;
	}

	/** @override */
	getPadding() {
		return 3;
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
	}

	/**
	 * 移除无效部分
	 * @complexity `n`
	 */
	removeRedundant() {
		Parser.run(() => {
			for (let i = this.childNodes.length - 1; i > 1; i--) {
				super.removeAt(i);
			}
		});
	}

	/**
	 * @override
	 * @returns {LintError[]}
	 */
	lint() {
		return [
			...this.childNodes.slice(0, 2).flatMap(child => child.lint()),
			this.childNodes.slice(2).map(child => {
				const {top, left, height, width} = child.getBoundingClientRect();
				return {
					message: '三重括号内的不可见部分',
					startLine: top,
					endLine: top + height - 1,
					startCol: left - 1,
					endCol: height > 1 ? width : left + width,
				};
			}),
		];
	}

	/**
	 * 移除子节点，且在移除`arg-default`子节点时自动移除全部多余子节点
	 * @param {number} i 移除位置
	 * @returns {Token}
	 */
	removeAt(i) {
		if (i === 1) {
			this.removeRedundant();
		}
		return super.removeAt(i);
	}

	/**
	 * @override
	 * @param {Token} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @throws `RangeError` 不可插入多余子节点
	 */
	insertAt(token, i = this.childNodes.length) {
		const j = i < 0 ? i + this.childNodes.length : i;
		if (j > 1 && !Parser.running) {
			throw new RangeError(`${this.constructor.name} 不可插入多余的子节点！`);
		}
		super.insertAt(token, i);
		if (j === 1) {
			token.type = 'arg-default';
		}
		return token;
	}

	/**
	 * 设置参数名
	 * @param {string} name 新参数名
	 * @throws `SyntaxError` 非法的参数名
	 */
	setName(name) {
		name = String(name);
		const root = Parser.parse(`{{{${name}}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{childNodes: {length}, firstChild: arg} = root;
		if (length !== 1 || arg.type !== 'arg' || arg.childNodes.length !== 1) {
			throw new SyntaxError(`非法的参数名称：${noWrap(name)}`);
		}
		const {firstChild} = arg;
		arg.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置预设值
	 * @param {string} value 预设值
	 * @throws `SyntaxError` 非法的参数预设值
	 */
	setDefault(value) {
		value = String(value);
		const root = Parser.parse(`{{{|${value}}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{childNodes: {length}, firstChild: arg} = root;
		if (length !== 1 || arg.type !== 'arg' || arg.childNodes.length !== 2) {
			throw new SyntaxError(`非法的参数预设值：${noWrap(value)}`);
		}
		const {childNodes: [, oldDefault]} = this,
			{lastChild} = arg;
		arg.destroy(true);
		if (oldDefault) {
			oldDefault.safeReplaceWith(lastChild);
		} else {
			this.appendChild(lastChild);
		}
	}
}

Parser.classes.ArgToken = __filename;
module.exports = ArgToken;
