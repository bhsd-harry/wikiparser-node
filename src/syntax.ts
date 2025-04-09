import {Token} from './index';
import type {Config, LintError} from '../base';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {syntax} from '../mixin/syntax';
import type {SyntaxBase} from '../mixin/syntax';

export interface SyntaxToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

declare type SyntaxTypes = 'heading-trail' | 'magic-word-name' | 'table-syntax' | 'redirect-syntax' | 'translate-attr';

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
		acceptable?: Acceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.#type = type;

		/* NOT FOR BROWSER */

		this.setAttribute('pattern', pattern);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return super.lint(start, false);
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAcceptable();
		return Shadow.run(() => {
			const token = new SyntaxToken(undefined, this.pattern, this.type, config, [], acceptable) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['SyntaxToken'] = __filename;
