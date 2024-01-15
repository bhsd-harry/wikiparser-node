import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {syntax} from '../mixin/syntax';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';

declare type SyntaxTypes = 'plain' | 'heading-trail' | 'magic-word-name' | 'table-syntax';

/** 满足特定语法格式的plain Token */
export class SyntaxToken extends syntax(Token) {
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
			acceptable = this.getAttribute('acceptable'),
			pattern = this.getAttribute('pattern');
		return Shadow.run(() => {
			const token = new SyntaxToken(undefined, pattern, this.type, config, [], acceptable) as this;
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}
}

classes['SyntaxToken'] = __filename;
