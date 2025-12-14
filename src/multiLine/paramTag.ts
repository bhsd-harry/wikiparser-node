import {parseCommentAndExt} from '../../parser/commentAndExt';
import {MultiLineToken} from './index';
import {ParamLineToken} from '../paramLine';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: ParamLineToken[]}`
 */
export abstract class ParamTagToken extends MultiLineToken {
	declare readonly childNodes: readonly ParamLineToken[];
	abstract override get firstChild(): ParamLineToken | undefined;
	abstract override get lastChild(): ParamLineToken | undefined;

	/** @param name 扩展标签名 */
	constructor(
		name: string,
		include: boolean,
		wikitext: string | undefined,
		config: Config,
		accum: Token[] = [],
		acceptable?: WikiParserAcceptable,
	) {
		super(undefined, config, accum, {
		});
		if (wikitext) {
			this.safeAppend(
				wikitext.split('\n')
					.map(line => acceptable ? line : parseCommentAndExt(line, config, accum, include))
					// @ts-expect-error abstract class
					.map((line): ParamLineToken => new ParamLineToken(name, line, config, accum, {
					})),
			);
		}
		accum.splice(accum.indexOf(this), 1);
		accum.push(this);
	}
}
