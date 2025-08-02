import {Token} from './index';
import type {Config} from '../base';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const atomTypes = [
	'arg-name',
	'template-name',
	'heading-trail',
	'magic-word-name',
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
}
