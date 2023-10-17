'use strict';
const parseBrackets = require('../../parser/brackets');
const Parser = require('../../index');
const ParamTagToken = require('.');

/** `<inputbox>` */
class InputboxToken extends ParamTagToken {
	/** @browser */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		const placeholder = Symbol('InputboxToken');
		accum.push(placeholder);
		const text = wikitext && parseBrackets(wikitext, config, accum);
		accum.splice(accum.indexOf(placeholder), 1);
		super(text, config, accum, {
			ArgToken: ':', TranscludeToken: ':',
		});
	}
}
Parser.classes.InputboxToken = __filename;
module.exports = InputboxToken;
