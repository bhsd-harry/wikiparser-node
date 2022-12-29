'use strict';

const {print, printError} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, Token, ...AtomToken]}`
 */
class ArgToken extends Token {
	type = 'arg';

	/**
	 * @param {string[]} parts
	 * @param {accum} accum
	 * @complexity `n`
	 */
	constructor(parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		for (const [i, part] of parts.entries()) {
			if (i === 0 || i > 1) {
				const AtomToken = require('./atom'),
					token = new AtomToken(part, `arg-${i === 0 ? 'name' : 'redundant'}`, config, accum);
				this.appendChild(token);
			} else {
				const token = new Token(part, config, true, accum);
				token.type = 'arg-default';
				this.appendChild(token.setAttribute('stage', 2));
			}
		}
	}

	toString() {
		return `{{{${super.toString('|')}}}}`;
	}

	print() {
		const {childNodes} = this;
		return `<span class="wpb-arg">{{{${print(childNodes.slice(0, 2), {sep: '|'})}${childNodes.length > 2
			? printError(`|${childNodes.slice(2).map(String).join('|')}`, 'Invisible content')
			: ''
		}}}}</span>`;
	}
}

module.exports = ArgToken;
