import * as Parser from '../index';
import {Token} from './index';

declare type SyntaxTypes = 'plain' | 'heading-trail' | 'magic-word-name' | 'table-syntax';

/** 满足特定语法格式的plain Token */
export class SyntaxToken extends Token {
	declare type: SyntaxTypes;

	/**
	 * @browser
	 * @param pattern 语法正则
	 * @throws `RangeError` 含有g修饰符的语法正则
	 */
	constructor(
		wikitext: string | undefined,
		// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
		pattern: RegExp,
		type: SyntaxTypes = 'plain',
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: Acceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.type = type;
	}
}
