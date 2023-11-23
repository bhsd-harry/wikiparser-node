import {hidden} from '../../mixin/hidden';
import * as Parser from '../../index';
import {TagPairToken} from './index';
import type {AstText, Token} from '../../internal';

/**
 * `<includeonly>`或`<noinclude>`或`<onlyinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
export class IncludeToken extends hidden(TagPairToken) {
	override readonly type = 'include';

	declare childNodes: [AstText, AstText];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AstText;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AstText;

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 */
	constructor(
		name: string,
		attr = '',
		inner?: string,
		closed?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(name, attr, inner ?? '', inner === undefined ? closed : closed ?? '', config, accum);
	}
}
