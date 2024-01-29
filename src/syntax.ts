import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {syntax} from '../mixin/syntax';
import Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';
import type {SyntaxBase} from '../mixin/syntax';

declare type SyntaxTypes = 'plain' | 'heading-trail' | 'magic-word-name' | 'table-syntax';

/** NOT FOR BROWSER */

export interface SyntaxToken extends SyntaxBase {}

/** NOT FOR BROWSER END */

/** 满足特定语法格式的plain Token */
@syntax()
export class SyntaxToken extends Token {
	declare type: SyntaxTypes;

	/** @param pattern 语法正则 */
	constructor(
		wikitext: string | undefined,
		pattern: RegExp,
		type: SyntaxTypes = 'plain',
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: Acceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.type = type;

		/* NOT FOR BROWSER */

		this.setAttribute('pattern', pattern);
	}

	/** @override */
	override lint(): LintError[] {
		return [];
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Shadow.run(() => {
			const token = new SyntaxToken(undefined, this.pattern, this.type, config, [], acceptable) as this;
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}
}

classes['SyntaxToken'] = __filename;
