'use strict';

const {text} = require('../util/string'),
	{generateForSelf, generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.');

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
class ArgToken extends Token {
	/** @type {'arg'} */ type = 'arg';

	/** default */
	get default() {
		return this.childNodes[1]?.text() ?? false;
	}

	/**
	 * @param {string[]} parts 以'|'分隔的各部分
	 * @param {Token[]} accum
	 * @complexity `n`
	 */
	constructor(parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
		});
		for (let i = 0; i < parts.length; i++) {
			if (i === 0 || i > 1) {
				const AtomToken = i === 0 ? require('./atom') : require('./atom/hidden');
				const token = new AtomToken(parts[i], i === 0 ? 'arg-name' : undefined, config, accum, {
				});
				super.insertAt(token);
			} else {
				const token = new Token(parts[i], config, true, accum);
				token.type = 'arg-default';
				super.insertAt(token.setAttribute('stage', 2));
			}
		}
	}

	/**
	 * @override
	 */
	toString(selector) {
		return `{{{${super.toString(selector, '|')}}}}`;
	}

	/** @override */
	text() {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
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
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		if (!this.getAttribute('include')) {
			return [generateForSelf(this, {start}, 'unexpected template argument')];
		}
		const {childNodes: [argName, argDefault, ...rest]} = this,
			errors = argName.lint(start + 3);
		if (argDefault) {
			errors.push(...argDefault.lint(start + 4 + String(argName).length));
		}
		if (rest.length > 0) {
			const rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(...rest.map(child => {
				const error = generateForChild(child, rect, 'invisible content inside triple brackets'),
					{startIndex, startCol, excerpt} = error;
				return {...error, startIndex: startIndex - 1, startCol: startCol - 1, excerpt: `|${excerpt}`};
			}));
		}
		return errors;
	}
}

module.exports = ArgToken;
