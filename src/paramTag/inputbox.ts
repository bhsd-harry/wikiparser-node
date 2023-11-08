import * as parseBrackets from '../../parser/brackets';
import * as Parser from '../../index';
import ParamTagToken = require('.');
import Token = require('..');

/** `<inputbox>` */
abstract class InputboxToken extends ParamTagToken {
	/** @browser */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
		const placeholder = Symbol('InputboxToken');
		accum.push(placeholder as unknown as Token);
		const text = wikitext && parseBrackets(wikitext, config, accum);
		accum.splice(accum.indexOf(placeholder as unknown as Token), 1);
		super(text, config, accum, {
			ArgToken: ':', TranscludeToken: ':',
		});
	}
}

Parser.classes['InputboxToken'] = __filename;
export = InputboxToken;
