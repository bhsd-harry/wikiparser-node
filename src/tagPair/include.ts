import {generateForSelf} from '../../util/lint';
import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {TagPairToken} from './index';
import type {LintError} from '../../base';
import type {AstText, Token} from '../../internal';

/**
 * `<includeonly>`或`<noinclude>`或`<onlyinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
export abstract class IncludeToken extends hiddenToken(TagPairToken) {
	override readonly type = 'include';

	declare readonly childNodes: readonly [AstText, AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;

	/* NOT FOR BROWSER */

	abstract override get children(): [];
	abstract override get firstElementChild(): undefined;
	abstract override get lastElementChild(): undefined;

	/**	@override */
	override get innerText(): string | undefined {
		return this.selfClosing ? undefined : this.lastChild.data;
	}

	override set innerText(text) {
		if (text === undefined) {
			this.selfClosing = true;
		} else {
			this.selfClosing = false;
			this.setText(text);
		}
	}

	/* NOT FOR BROWSER END */

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

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		if (this.closed) {
			return [];
		}
		const e = generateForSelf(this, {start}, 'unclosed-comment', Parser.msg('unclosed $1', `<${this.name}>`));
		e.suggestions = [
			{
				desc: 'close',
				range: [e.endIndex, e.endIndex],
				text: `</${this.name}>`,
			},
		];
		return [e];
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			{innerText} = this,
			closing = this.selfClosing || !this.closed ? undefined : tags[1];
		// @ts-expect-error abstract class
		return Shadow.run(() => new IncludeToken(tags[0], this.firstChild.data, innerText, closing, config) as this);
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

classes['IncludeToken'] = __filename;
