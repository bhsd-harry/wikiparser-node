import {Token} from './index';
import type {Config} from '../base';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';

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
	'converter-rule-to',
	'converter-rule-from',
	'invoke-function',
	'invoke-module',
	'template-name',
	'link-target',
	'param-line',
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
		acceptable?: Acceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.#type = type;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAcceptable();
		return Shadow.run(() => {
			const token = new AtomToken(undefined, this.type, config, [], acceptable) as this;
			token.safeAppend(cloned);
			return token;
		});
	}
}

classes['AtomToken'] = __filename;
