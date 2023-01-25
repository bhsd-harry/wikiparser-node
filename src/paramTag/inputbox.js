'use strict';

const parseBrackets = require('../../parser/brackets'),
	singleLine = require('../../mixin/singleLine'),
	Parser = require('../..'),
	ParamTagToken = require('.'),
	AtomToken = require('../atom');

/**
 * `<inputbox>`
 * @classdesc `{childNodes: ...SingleLineAtomToken}`
 */
class InputboxToken extends ParamTagToken {
	name = 'inputbox';

	/**
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(undefined, config, accum);
		wikitext = parseBrackets(wikitext, config, accum);
		accum.splice(accum.indexOf(this), 1);
		accum.push(this);
		if (wikitext) {
			const SingleLineAtomToken = singleLine(AtomToken);
			this.append(...wikitext.split('\n').map(line => new SingleLineAtomToken(line, 'param-line', config, accum, {
				AstText: ':', ArgToken: ':', TranscludeToken: ':',
			})));
		}
	}

	/** @override */
	afterBuild() {
		for (const heading of this.querySelectorAll('heading')) {
			const {firstChild, lastChild, name} = heading,
				syntax = '='.repeat(name);
			heading.replaceWith(syntax, ...firstChild.cloneChildNodes(), `${syntax}${String(lastChild)}`);
		}
	}
}

Parser.classes.InputboxToken = __filename;
module.exports = InputboxToken;
