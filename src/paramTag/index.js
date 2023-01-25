'use strict';

const {generateForChild} = require('../../util/lint'),
	singleLine = require('../../mixin/singleLine'),
	Parser = require('../..'),
	Token = require('..'),
	AtomToken = require('../atom');

/**
 * `<inputbox>`
 * @classdesc `{childNodes: ...AtomToken}`
 */
class ParamTagToken extends Token {
	type = 'ext-inner';

	/**
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			SingleLineAtomToken: ':',
		});
		if (wikitext) {
			const SingleLineAtomToken = singleLine(AtomToken);
			this.append(
				...wikitext.split('\n').map(line => new SingleLineAtomToken(line, 'param-line', config, accum, {
					AstText: ':',
				})),
			);
		}
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/** @override */
	text() {
		return super.text('\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		return super.print({sep: '\n'});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		let /** @type {{top: number, left: number}} */ rect;
		return this.childNodes.filter(child => {
			const {childNodes} = child,
				i = childNodes.findIndex(({type}) => type !== 'text'),
				str = (i >= 0 ? childNodes.slice(0, i).map(String).join('') : String(child)).trim();
			return str && !(i >= 0 ? /^[a-z]+\s*(?:=|$)/iu : /^[a-z]+\s*=/iu).test(str);
		}).map(child => {
			rect ||= this.getRootNode().posFromIndex(start);
			return generateForChild(child, rect, `${this.name}的无效参数`);
		});
	}

	/**
	 * @override
	 * @this {ParamTagToken & {constructor: typeof ParamTagToken}}
	 */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new this.constructor(undefined, this.getAttribute('config'));
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes.ParamTagToken = __filename;
module.exports = ParamTagToken;
