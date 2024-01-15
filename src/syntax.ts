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
	}

	/** @override */
	override lint(): LintError[] {
		return [];
	}
	}
}
