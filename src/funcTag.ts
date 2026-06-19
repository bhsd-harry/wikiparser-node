import {Token} from './index';
import {ParamLineToken} from './paramLine';
import {gapped} from '../mixin/gapped';
import type {Config} from '../base';
import type {AttributesToken, ExtToken} from '../internal';

/**
 * `<seo>`
 * @classdesc `{childNodes: ParamLineToken[]}`
 */
@gapped()
export abstract class FuncTagToken extends Token {
	declare readonly name: 'seo';
	declare readonly childNodes: readonly ParamLineToken[];
	abstract override get firstChild(): ParamLineToken | undefined;
	abstract override get lastChild(): ParamLineToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(wikitext: string | undefined, config: Config, accum: Token[]) {
		super(undefined, config, accum, {
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
}
