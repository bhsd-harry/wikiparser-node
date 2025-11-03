import {Token} from './index';
import type {Config, LintError} from '../base';

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

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: return super.lint(start, false);
	}
}
