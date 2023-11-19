import {fixed} from '../../mixin/fixed';
import * as Parser from '../../index';
import {Token} from '..';
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
	declare childNodes: [AstText];
	abstract override get children(): [];
	abstract override get firstChild(): AstText;
	abstract override get firstElementChild(): undefined;
	abstract override get lastChild(): AstText;
	abstract override get lastElementChild(): undefined;

	/** @browser */
	constructor(wikitext = '', config = Parser.getConfig(), accum: Token[] = []) {
		super(wikitext, config, true, accum);
	}

	/** @override */
	override cloneNode(this: this & {constructor: new (...args: any[]) => unknown}): this {
		const {constructor, firstChild: {data}, type} = this,
			token = Parser.run(() => new constructor(data, this.getAttribute('config')) as this);
		token.type = type;
		return token;
	}

	/**
	 * @override
	 * @param str 新文本
	 */
	override setText(str: string): string {
		return super.setText(str, 0);
	}
}

Parser.classes['NowikiBaseToken'] = __filename;
