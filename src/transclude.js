'use strict';

const {removeComment, print} = require('../util/string'),
	Parser = require('..'),
	Token = require('.'),
	ParameterToken = require('./parameter');

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...ParameterToken]}`
 */
class TranscludeToken extends Token {
	type = 'template';
	modifier = '';

	/**
	 * 设置引用修饰符
	 * @param {string} modifier 引用修饰符
	 * @complexity `n`
	 */
	setModifier(modifier = '') {
		const {parserFunction: [,, raw, subst]} = this.getAttribute('config'),
			lcModifier = modifier.trim().toLowerCase(),
			isRaw = raw.includes(lcModifier),
			isSubst = subst.includes(lcModifier);
		if (isRaw || isSubst || modifier === '') {
			this.setAttribute('modifier', modifier);
			return Boolean(modifier);
		}
		return false;
	}

	/**
	 * @param {string} title 模板标题或魔术字
	 * @param {[string, string|undefined][]} parts 参数各部分
	 * @param {accum} accum
	 * @complexity `n`
	 * @throws `SyntaxError` 非法的模板名称
	 */
	constructor(title, parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		const AtomToken = require('./atom'),
			SyntaxToken = require('./syntax');
		const {parserFunction: [insensitive, sensitive, raw]} = config;
		if (title.includes(':')) {
			const [modifier, ...arg] = title.split(':');
			if (this.setModifier(modifier)) {
				title = arg.join(':');
			}
		}
		if (title.includes(':') || parts.length === 0 && !raw.includes(this.modifier.toLowerCase())) {
			const [magicWord, ...arg] = title.split(':'),
				name = removeComment(magicWord),
				isSensitive = sensitive.includes(name);
			if (isSensitive || insensitive.includes(name.toLowerCase())) {
				this.setAttribute('name', name.toLowerCase().replace(/^#/u, '')).type = 'magic-word';
				const token = new SyntaxToken(magicWord, 'magic-word-name', config, accum);
				this.appendChild(token);
				if (arg.length > 0) {
					parts.unshift([arg.join(':')]);
				}
				if (this.name === 'invoke') {
					for (let i = 0; i < 2; i++) {
						const part = parts.shift();
						if (!part) {
							break;
						}
						const invoke = new AtomToken(part.join('='), `invoke-${
							i ? 'function' : 'module'
						}`, config, accum);
						this.appendChild(invoke);
					}
				}
			}
		}
		if (this.type === 'template') {
			const [name] = removeComment(title).split('#');
			if (/\0\d+[eh!+-]\x7F|[<>[\]{}]/u.test(name)) {
				accum.pop();
				throw new SyntaxError(`非法的模板名称：${name}`);
			}
			const token = new AtomToken(title, 'template-name', config, accum);
			this.appendChild(token);
		}
		const templateLike = !(this.type === 'magic-word' && this.name !== 'invoke');
		let i = 1;
		for (const part of parts) {
			if (!templateLike) {
				part[0] = part.join('=');
				part.length = 1;
			}
			if (part.length === 1) {
				part.unshift(i);
				i++;
			}
			this.appendChild(new ParameterToken(...part, config, accum));
		}
	}

	/** @override */
	toString() {
		const {childNodes, firstChild, modifier} = this;
		return `{{${modifier}${modifier && ':'}${
			this.type === 'magic-word'
				? `${String(firstChild)}${length > 1 ? ':' : ''}${childNodes.slice(1).map(String).join('|')}`
				: super.toString('|')
		}}}`;
	}

	/** @override */
	getPadding() {
		return this.modifier ? this.modifier.length + 3 : 2;
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		const {childNodes, firstChild, modifier} = this;
		return `<span class="wpb-${this.type}">{{${modifier}${modifier && ':'}${
			this.type === 'magic-word'
				? `${firstChild.print()}${length > 1 ? ':' : ''}${print(childNodes.slice(1), {sep: '|'})}`
				: print(childNodes, {sep: '|'})
		}}}</span>`;
	}
}

module.exports = TranscludeToken;
