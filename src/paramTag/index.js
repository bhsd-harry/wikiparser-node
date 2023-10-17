'use strict';
const lint_1 = require('../../util/lint');
const {generateForChild} = lint_1;
const singleLine = require('../../mixin/singleLine');
const Parser = require('../../index');
const Token = require('..');
const AtomToken = require('../atom');

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: ...AtomToken}`
 */
class ParamTagToken extends Token {
	/** @browser */
	type = 'ext-inner';
	/** @browser */
	constructor(wikitext, config = Parser.getConfig(), accum = [], acceptable = {}) {
		super(undefined, config, true, accum, {
			SingleLineAtomToken: ':',
		});
		if (wikitext) {
			const SingleLineAtomToken = singleLine(AtomToken);
			this.append(...wikitext.split('\n').map(line => new SingleLineAtomToken(line, 'param-line', config, accum, {
				AstText: ':', ...acceptable,
			})));
		}
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		return super.text('\n');
	}

	/** @private */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print({sep: '\n'});
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		let rect;
		return this.childNodes.filter(child => {
			const {childNodes} = child,
				i = childNodes.findIndex(({type}) => type !== 'text'),
				str = (i >= 0 ? childNodes.slice(0, i).map(String).join('') : String(child)).trim();
			return str && !(i >= 0 ? /^[a-z]+(?:\[\])?\s*(?:=|$)/iu : /^[a-z]+(?:\[\])?\s*=/iu).test(str);
		}).map(child => {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			return generateForChild(child, rect, Parser.msg('invalid parameter of $1', this.name));
		});
	}

	/** @override */
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
