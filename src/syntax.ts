import {Token} from './index';
import type {
	Config,
} from '../base';

/* NOT FOR BROWSER */

import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

declare type SyntaxTypes = 'heading-trail'
	| 'magic-word-name'
	| 'table-syntax'
	| 'redirect-syntax'
	| 'translate-attr'
	| 'tvar-name';

/**
 * plain token that satisfies specific grammar syntax
 *
 * 满足特定语法格式的plain Token
 */
export class SyntaxToken extends Token {
	readonly #type;

	override get type(): SyntaxTypes {
		return this.#type;
	}

	/**
	 * @class
	 */
	constructor(
		wikitext: string | undefined,
		type: SyntaxTypes,
		config?: Config,
		accum?: Token[],
		acceptable?: WikiParserAcceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.#type = type;
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		return new SyntaxToken(
			undefined,
			this.type,
			this.getAttribute('config'),
		) as this;
	}
}
