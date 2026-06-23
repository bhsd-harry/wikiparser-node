import {paramLineParent} from '../mixin/paramLineParent';
import {Token} from './index';
import {ParamLineToken} from './paramLine';
import {gapped} from '../mixin/gapped';
import type {Config} from '../base';
import type {AttributesToken, ExtToken} from '../internal';
import type {ParamLineParentBase} from '../mixin/paramLineParent';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

export interface FuncTagToken extends ParamLineParentBase {}

/**
 * `<seo>`
 * @classdesc `{childNodes: ParamLineToken[]}`
 */
@gapped() @paramLineParent
export abstract class FuncTagToken extends Token {
	declare readonly name: 'seo';
	declare readonly childNodes: readonly ParamLineToken[];
	abstract override get firstChild(): ParamLineToken | undefined;
	abstract override get lastChild(): ParamLineToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): ParamLineToken[];
	abstract override get firstElementChild(): ParamLineToken | undefined;
	abstract override get lastElementChild(): ParamLineToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(wikitext: string | undefined, config: Config, accum: Token[]) {
		super(undefined, config, accum, {
			AstText: ':',
		});
		if (wikitext) {
			for (const parameter of wikitext.split('|')) {
				// @ts-expect-error abstract class
				this.insertAt(new ParamLineToken('seo', parameter, '|', config, accum));
			}
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '|');
	}

	/** @private */
	override text(): string {
		return this.childNodes.map(child => child.text()).filter(Boolean).join('|');
	}

	/** @private */
	override print(): string {
		PRINT: return super.print({sep: '|'});
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new FuncTagToken(undefined, this.getAttribute('config'));
	}
}

classes['FuncTagToken'] = __filename;
