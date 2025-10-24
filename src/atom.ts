import {Token} from './index';
import type {Config} from '../base';

/* PRINT ONLY */

import type {ConverterFlagsToken} from '../internal';

/* PRINT ONLY END */

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

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

	override set type(value) {
		/* istanbul ignore if */
		if (!atomTypes.includes(value)) {
			throw new RangeError(`"${value}" is not a valid type for AtomToken!`);
		}
		this.#type = value;
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

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid'
			? (
				this.type === 'converter-flag'
				&& Boolean((this.parentNode as ConverterFlagsToken | undefined)?.isInvalidFlag(this))
			) as TokenAttribute<T>
			: super.getAttribute(key);
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		return new AtomToken(
			undefined,
			this.type,
			this.getAttribute('config'),
			[],
			this.getAcceptable(),
		) as this;
	}
}

classes['AtomToken'] = __filename;
