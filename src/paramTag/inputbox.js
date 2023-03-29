'use strict';

const parseBrackets = require('../../parser/brackets'),
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
	 * @param {import('../../typings/token').accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(undefined, config, accum);
		wikitext = parseBrackets(wikitext, config, accum);
		accum.splice(accum.indexOf(this), 1);
		accum.push(this);
		if (wikitext) {
			const SingleLineAtomToken = AtomToken;
			this.append(...wikitext.split('\n').map(line => new SingleLineAtomToken(line, 'param-line', config, accum, {
			})));
		}
	}
}

module.exports = InputboxToken;
