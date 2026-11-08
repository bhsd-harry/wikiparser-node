import {Token} from './index';
import type {Config} from '../base';

/* NOT FOR BROWSER */

import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const atomTypes = [
	'arg-name',
	'attr-key',
	'attr-value',
	'ext-attr-dirty',
	'html-attr-dirty',
	'table-attr-dirty',
	'converter-flag',
	'converter-rule-variant',
	'invoke-function',
	'invoke-module',
	'template-name',
	'link-target',
	'param-line-key',
	'param-line-value',
] as const;

declare type AtomTypes = typeof atomTypes[number];

/**
 * plain Token that will not be parsed further
 *
 * 不会被继续解析的plain Token
 */
export class AtomToken extends Token {
	#type;

	override get type(): AtomTypes {
		return this.#type;
	}

	/** @class */
	constructor(
		wikitext: string | undefined,
		type: AtomTypes,
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
		return new AtomToken(
			undefined,
			this.type,
			this.getAttribute('config'),
		) as this;
	}
}
