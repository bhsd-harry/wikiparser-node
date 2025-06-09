import {generateForSelf, generateForChild} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {TagPairToken} from './index';
import type {LintError, Config} from '../../base';
import type {AstText, Token} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
 * `<includeonly>`, `<noinclude>` or `<onlyinclude>`
 *
 * `<includeonly>`或`<noinclude>`或`<onlyinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
@hiddenToken(false)
export abstract class IncludeToken extends TagPairToken {
	declare readonly childNodes: readonly [AstText, AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;

	/* NOT FOR BROWSER */

	abstract override get children(): [];
	abstract override get firstElementChild(): undefined;
	abstract override get lastElementChild(): undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'include' {
		return 'include';
	}

	/* NOT FOR BROWSER */

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
	constructor(name: string, attr = '', inner?: string, closed?: string, config?: Config, accum?: Token[]) {
		super(name, attr, inner ?? '', inner === undefined ? closed : closed ?? '', config, accum);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : super.toString();
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors: LintError[] = [],
			{firstChild, closed, name} = this,
			rect = new BoundingRect(this, start);
		if (firstChild.data.trim()) {
			const e = generateForChild(
				firstChild,
				rect,
				'no-ignored',
				'useless attribute',
				'warning',
			);
			e.suggestions = [{desc: 'remove', range: [e.startIndex, e.endIndex], text: ''}];
			errors.push(e);
		}
		if (!closed) {
			const e = generateForSelf(
				this,
				rect,
				'unclosed-comment',
				Parser.msg('unclosed $1', `<${name}>`),
			);
			e.suggestions = [{desc: 'close', range: [e.endIndex, e.endIndex], text: `</${name}>`}];
			errors.push(e);
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			{innerText} = this,
			closing = this.selfClosing || !this.closed ? undefined : tags[1];
		// @ts-expect-error abstract class
		return Shadow.run((): this => new IncludeToken(tags[0], this.firstChild.data, innerText, closing, config));
	}

	/**
	 * @override
	 * @param str new text / 新文本
	 */
	override setText(str: string): string {
		return super.setText(str, 1);
	}

	/**
	 * Remove tag attributes
	 *
	 * 清除标签属性
	 */
	removeAttr(): void {
		super.setText('');
	}
}

classes['IncludeToken'] = __filename;
