'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('./token'),
	watchFirstChild = require('../mixin/watchFirstChild');

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, Token, ...AtomToken]}`
 */
class ArgToken extends watchFirstChild(Token) {
	type = 'arg';

	/**
	 * @param {string[]} parts
	 * @param {accum} accum
	 */
	constructor(parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {Token: 1, AtomToken: [0, '2:']});
		for (const [i, part] of parts.entries()) {
			if (i === 0 || i > 1) {
				const AtomToken = require('./atomToken'),
					token = new AtomToken(part, i === 0 ? 'arg-name' : 'arg-redundant', accum, {
						String: ':', CommentToken: ':', ExtToken: ':', NoincludeToken: ':', IncludeToken: ':',
						ArgToken: ':', TranscludeToken: ':',
					});
				super.insertAt(token);
			} else {
				const token = new Token(part, config, true, accum);
				token.type = 'arg-default';
				token.setAttribute('stage', 2);
				super.insertAt(token);
			}
		}
		this.protectChildren(0);
	}

	toString() {
		return `{{{${super.toString('|')}}}}`;
	}

	getPadding() {
		return 3;
	}

	getGaps() {
		return 1;
	}

	text() {
		return `{{{${this.children.slice(0, 2).map(child => child.text()).join('|')}}}}`;
	}

	plain() {
		return this.childElementCount > 1 ? this.children[1].plain() : [];
	}

	afterBuild() {
		const name = this.firstElementChild.text().trim();
		this.setAttribute('name', name);
		return super.afterBuild();
	}

	removeRedundant() {
		for (let i = this.childElementCount - 1; i > 1; i--) {
			super.removeAt(i);
		}
	}

	/**
	 * 删除`arg-default`子节点时自动删除全部`arg-redundant`子节点
	 * @param {number} i
	 * @returns {Token}
	 */
	removeAt(i) {
		if (i === 1) {
			this.removeRedundant();
		}
		return super.removeAt(i);
	}

	/** @param {Token} token */
	insertAt(token, i = this.childNodes.length) {
		if (i !== 1 || this.childElementCount !== 1) {
			throw new RangeError(`${this.constructor.name} 不可插入 arg-name 或 arg-redundant 子节点！`);
		}
		token.type = 'arg-default';
		return super.insertAt(token, i);
	}

	/** @param {string} name */
	setName(name) {
		name = String(name);
		const root = new Token(`{{{${name}}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'arg' || firstElementChild.childElementCount !== 1) {
			throw new SyntaxError(`非法的参数名称：${name.replaceAll('\n', '\\n')}`);
		}
		const /** @type {Token} */ oldName = this.firstChild,
			newName = firstElementChild.firstElementChild;
		root.destroy();
		firstElementChild.destroy();
		oldName.safeReplaceWith(newName);
		this.setAttribute('name', newName.text().trim());
	}

	/** @param {string} value */
	setDefault(value) {
		value = String(value);
		const root = new Token(`{{{|${value}}}}`, this.getAttribute('config')).parse(2),
			{childNodes: {length}, firstElementChild} = root;
		if (length !== 1 || firstElementChild?.type !== 'arg' || firstElementChild.childElementCount !== 2) {
			throw new SyntaxError(`非法的参数预设值：${value.replaceAll('\n', '\\n')}`);
		}
		const /** @type {Token[]} */ [, oldDefault] = this.children,
			newDefault = firstElementChild.lastElementChild;
		root.destroy();
		firstElementChild.destroy();
		if (oldDefault) {
			oldDefault.safeReplaceWith(newDefault);
		} else {
			this.appendChild(newDefault);
		}
	}
}

Parser.classes.ArgToken = __filename;
module.exports = ArgToken;
