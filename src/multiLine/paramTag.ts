import {parseCommentAndExt} from '../../parser/commentAndExt';
import {MultiLineToken} from './index';
import {ParamLineToken} from '../paramLine';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {clone} from '../../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: ParamLineToken[]}`
 */
export abstract class ParamTagToken extends MultiLineToken {
	declare readonly childNodes: readonly ParamLineToken[];
	abstract override get firstChild(): ParamLineToken | undefined;
	abstract override get lastChild(): ParamLineToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): ParamLineToken[];
	abstract override get firstElementChild(): ParamLineToken | undefined;
	abstract override get lastElementChild(): ParamLineToken | undefined;

	/* NOT FOR BROWSER END */

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
			ParamLineToken: ':',
		});
		if (wikitext) {
			this.safeAppend(
				wikitext.split('\n')
					.map(line => acceptable ? line : parseCommentAndExt(line, config, accum, include))
					// @ts-expect-error abstract class
					.map((line): ParamLineToken => new ParamLineToken(name, line, config, accum, {
						'Stage-1': ':', ...acceptable ?? {'!ExtToken': ''},
					})),
			);
		}
		accum.splice(accum.indexOf(this), 1);
		accum.push(this);
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		const C = this.constructor as new (...args: any[]) => this;
		return new C(this.name, this.getAttribute('include'), undefined, this.getAttribute('config'));
	}
}

classes['ParamTagToken'] = __filename;
