import {parseBraces} from '../../parser/braces';
import * as Parser from '../../index';
import {ParamTagToken} from './index';
import type {Token} from '../index';

/** `<inputbox>` */
// @ts-expect-error not implementing all abstract methods
export class InputboxToken extends ParamTagToken {
	/** @browser */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
		const placeholder = Symbol('InputboxToken');
		accum.push(placeholder as unknown as Token);
		wikitext &&= parseBraces(wikitext, config, accum);
		accum.splice(accum.indexOf(placeholder as unknown as Token), 1);
		super(wikitext, config, accum, {
		});
	}
}
