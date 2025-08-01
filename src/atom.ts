import {Token} from './index';
import type {Config} from '../base';

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
}
