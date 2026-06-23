import {paramLineParent} from '../../mixin/paramLineParent';
import {MultiLineToken} from './index';
import {ParamLineToken} from '../paramLine';
import type {Config} from '../../base';
import type {Token} from '../../internal';
import type {ParamLineParentBase} from '../../mixin/paramLineParent';

export interface ParamTagToken extends ParamLineParentBase {}

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: ParamLineToken[]}`
 */
@paramLineParent
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
				// @ts-expect-error abstract class
				wikitext.split('\n').map((line): ParamLineToken => new ParamLineToken(
					name,
					line,
					'\n',
					config,
					accum,
				)),
			);
		}
	}
}
