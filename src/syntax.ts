import {Token} from './index';
import type {Config, LintError} from '../base';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';
import {syntax} from '../mixin/syntax';
import type {SyntaxBase} from '../mixin/syntax';

export interface SyntaxToken extends SyntaxBase {}

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
@syntax()
export class SyntaxToken extends Token {
	readonly #type;

	override get type(): SyntaxTypes {
		return this.#type;
	}

	/**
	 * @class
	 * @param pattern 语法正则
	 */
	constructor(
		wikitext: string | undefined,
		pattern: RegExp,
		type: SyntaxTypes,
		config?: Config,
		accum?: Token[],
		acceptable?: WikiParserAcceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.#type = type;

		/* NOT FOR BROWSER */

		this.setAttribute('pattern', pattern);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: return super.lint(start, false);
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		return new SyntaxToken(
			undefined,
			this.pattern,
			this.type,
			this.getAttribute('config'),
			[],
			this.getAcceptable(),
		) as this;
	}
}

classes['SyntaxToken'] = __filename;
