import {parseBraces} from '../../parser/braces';
import Parser from '../../index';
import {ParamTagToken} from '.';
import type {Token} from '..';

/** `<inputbox>` */
export abstract class InputboxToken extends ParamTagToken {
	/** @browser */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
		const placeholder = Symbol('InputboxToken');
		accum.push(placeholder as unknown as Token);
		wikitext &&= parseBraces(wikitext, config, accum);
		accum.splice(accum.indexOf(placeholder as unknown as Token), 1);
		super(wikitext, config, accum, {
			ArgToken: ':', TranscludeToken: ':',
		});
	}
}

Parser.classes['InputboxToken'] = __filename;
