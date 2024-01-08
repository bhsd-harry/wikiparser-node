import * as Parser from '../../index';
import {Token} from '../index';
import type {AstText} from '../../lib/text';

declare type NowikiTypes = 'ext-inner'
| 'comment'
| 'dd'
| 'double-underscore'
| 'hr'
| 'list'
| 'noinclude'
| 'quote';

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
export abstract class NowikiBaseToken extends fixed(Token) {
	declare type: NowikiTypes;

	declare readonly childNodes: [AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;

	/** 纯文本部分 */
	get innerText(): string {
		return this.firstChild.data;
	}

	/** @param wikitext default: `''` */
	constructor(wikitext = '', config = Parser.getConfig(), accum: Token[] = []) {
		super(wikitext, config, accum);
	}
}
