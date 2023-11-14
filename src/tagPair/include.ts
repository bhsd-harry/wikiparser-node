import {hidden} from '../../mixin/hidden';
import Parser from '../../index';
import {TagPairToken} from '.';
import type {AstText, Token} from '../../internal';

/**
 * `<includeonly>`或`<noinclude>`或`<onlyinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
export abstract class IncludeToken extends hidden(TagPairToken) {
	/** @browser */
	override readonly type = 'include';
	declare childNodes: [AstText, AstText];
	abstract override get children(): [];
	abstract override get firstChild(): AstText;
	abstract override get firstElementChild(): undefined;
	abstract override get lastChild(): AstText;
	abstract override get lastElementChild(): undefined;

	/**
	 * @browser
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

	/** @override */
	override cloneNode(): this {
		const tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			inner = this.selfClosing ? undefined : this.lastChild.data,
			closing = this.selfClosing || !this.closed ? undefined : tags[1];
		// @ts-expect-error abstract class
		return Parser.run(() => new IncludeToken(tags[0], this.firstChild.data, inner, closing, config));
	}

	/**
	 * @override
	 * @param str 新文本
	 */
	override setText(str: string): string {
		return super.setText(str, 1);
	}

	/** 清除标签属性 */
	removeAttr(): void {
		super.setText('');
	}
}

Parser.classes['IncludeToken'] = __filename;
