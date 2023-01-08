'use strict';

const Parser = require('..'),
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
		super(undefined, config, true, accum);
		for (let i = 0; i < parts.length; i++) {
			if (i === 0 || i > 1) {
				const AtomToken = i === 0 ? require('./atom') : require('./atom/hidden');
				const token = new AtomToken(parts[i], i === 0 ? 'arg-name' : undefined, config, accum);
				this.appendChild(token);
			} else {
				const token = new Token(parts[i], config, true, accum);
				token.type = 'arg-default';
				this.appendChild(token.setAttribute('stage', 2));
			}
		}
	}

	/** @override */
	toString() {
		return `{{{${super.toString('|')}}}}`;
	}

	/** @override */
	getPadding() {
		return 3;
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
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
}

module.exports = ArgToken;
