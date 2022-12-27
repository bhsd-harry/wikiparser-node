'use strict';

const {removeComment, print} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.'),
	ParameterToken = require('./parameter');

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...ParameterToken]}`
 */
class TranscludeToken extends Token {
	type = 'template';
	modifier = '';

	/** @complexity `n` */
	setModifier(modifier = '') {
		const [,, raw, subst] = this.getAttribute('config').parserFunction,
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
	 * @param {string} title
	 * @param {[string, string|undefined][]} parts
	 * @param {accum} accum
	 * @complexity `n`
	 */
	constructor(title, parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		const AtomToken = require('./atom'),
			SyntaxToken = require('./syntax'),
			{parserFunction: [insensitive, sensitive, raw]} = config;
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
				this.setAttribute('name', name.toLowerCase().replace(/^#/, '')).type = 'magic-word';
				const pattern = new RegExp(`^\\s*${name}\\s*$`, isSensitive ? '' : 'i'),
					token = new SyntaxToken(magicWord, pattern, 'magic-word-name', config, accum);
				this.appendChild(token);
				if (arg.length) {
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
			if (/\x00\d+[eh!+-]\x7f|[<>[\]{}]/.test(name)) {
				accum.pop();
				throw new SyntaxError(`非法的模板名称：${name}`);
			}
			const token = new AtomToken(title, 'template-name', config, accum);
			this.appendChild(token);
		}
		const notTemplateLike = this.type === 'magic-word' && this.name !== 'invoke';
		let i = 1;
		for (const part of parts) {
			if (notTemplateLike) {
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

	toString() {
		const {children, childNodes: {length}, firstChild} = this;
		return `{{${this.modifier}${this.modifier && ':'}${
			this.type === 'magic-word'
				? `${String(firstChild)}${length > 1 ? ':' : ''}${children.slice(1).map(String).join('|')}`
				: super.toString('|')
		}}}`;
	}

	print() {
		const {children, childNodes: {length}, firstElementChild} = this;
		return `<span class="wpb-${this.type}">{{${this.modifier}${this.modifier && ':'}${
			this.type === 'magic-word'
				? `${firstElementChild.print()}${length > 1 ? ':' : ''}${print(children.slice(1), {sep: '|'})}`
				: print(children, {sep: '|'})
		}}}</span>`;
	}
}

module.exports = TranscludeToken;
