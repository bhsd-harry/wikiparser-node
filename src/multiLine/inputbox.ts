import {parseCommentAndExt} from '../../parser/commentAndExt';
import {parseBraces} from '../../parser/braces';
import {ParamTagToken} from './paramTag';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/** `<inputbox>` */
export abstract class InputboxToken extends ParamTagToken {
	/** @param name 扩展标签名 */
	constructor(name: string, include: boolean, wikitext: string | undefined, config: Config, accum: Token[] = []) {
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
		super(name, include, wikitext, newConfig, accum, {
		});
	}
}
