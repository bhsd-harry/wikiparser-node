import {parseBraces} from '../../parser/braces';
import Parser from '../../index';
import {ParamTagToken} from './index';
import type {Token} from '../index';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/** `<inputbox>` */
export abstract class InputboxToken extends ParamTagToken {
	/** @class */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
		const placeholder = Symbol('InputboxToken'),
			{length} = accum;
		accum.push(placeholder as unknown as Token);
		wikitext &&= parseBraces(wikitext, config, accum);
		accum.splice(length, 1);
		super(wikitext, config, accum, {
			ArgToken: ':', TranscludeToken: ':',
		});
	}
}

classes['InputboxToken'] = __filename;
