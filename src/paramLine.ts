import {gapped} from '../mixin/gapped';
import {Token} from './index';
import {AtomToken} from './atom';
import type {Config} from '../base';
import type {ParamTagToken, FuncTagToken} from '../internal';

/* NOT FOR BROWSER */

import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * parameter of certain extension tags
 *
 * 某些扩展标签的参数
 * @classdesc `{childNodes: [AtomToken, AtomToken?]}`
 */
@gapped()
export abstract class ParamLineToken extends Token {
	declare readonly name: string;
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, AtomToken];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): AtomToken;
	abstract override get parentNode(): ParamTagToken | FuncTagToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): this | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, AtomToken];
	abstract override get previousElementSibling(): this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'param-line' {
		return 'param-line';
	}

	/** @param name 扩展标签名 */
	constructor(
		name: string,
		wikitext: string,
		config: Config,
		accum: Token[],
		// eslint-disable-next-line unicorn/no-object-as-default-parameter
		acceptable: WikiParserAcceptable = {
			AstText: ':',
		},
	) {
		super(undefined, config, accum, {
			AtomToken: '0:2',
		});
		this.setAttribute('name', name);
		const equal = wikitext.indexOf('=');
		if (equal === -1) {
			this.insertAt(new AtomToken(wikitext, 'param-line-key', config, accum, acceptable));
		} else {
			this.append(
				new AtomToken(wikitext.slice(0, equal), 'param-line-key', config, accum, acceptable),
				new AtomToken(wikitext.slice(equal + 1), 'param-line-value', config, accum, acceptable),
			);
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '=');
	}

	/** @private */
	override text(): string {
		return this.childNodes.map(child => child.text().trim()).join('=');
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		const token: this = new ParamLineToken(this.name, '', this.getAttribute('config'));
		token.removeAt(0);
		return token;
	}
}
