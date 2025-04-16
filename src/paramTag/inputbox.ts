import {parseCommentAndExt} from '../../parser/commentAndExt';
import {parseBraces} from '../../parser/braces';
import Parser from '../../index';
import {ParamTagToken} from './index';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/** `<inputbox>` */
export abstract class InputboxToken extends ParamTagToken {
	/** @class */
	constructor(include: boolean, wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
		const placeholder = Symbol('InputboxToken'),
			newConfig = config.excludes.includes('heading')
				? config
				: {
					...config,
					excludes: [...config.excludes, 'heading'],
				},
			{length} = accum;
		accum.push(placeholder as unknown as Token);
		wikitext &&= parseCommentAndExt(wikitext, newConfig, accum, include);
		wikitext &&= parseBraces(wikitext, newConfig, accum);
		accum.splice(length, 1);
		super(include, wikitext, newConfig, accum, {
			ArgToken: ':', TranscludeToken: ':',
		});
	}
}

classes['InputboxToken'] = __filename;
