import {Token} from './index';
import type {Config} from '../base';

declare type SyntaxTypes = 'plain' | 'heading-trail' | 'magic-word-name' | 'table-syntax' | 'redirect-syntax';

/** 满足特定语法格式的plain Token */
export class SyntaxToken extends Token {
	declare type: SyntaxTypes;

	/** @param pattern 语法正则 */
	constructor(
		wikitext: string | undefined,
		pattern: RegExp,
		type: SyntaxTypes = 'plain',
		config?: Config,
		accum?: Token[],
		acceptable?: Acceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.type = type;
	}

	/** @private */
	override lint(): [] {
		return [];
	}
}
