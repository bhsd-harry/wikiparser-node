import {generateForSelf} from '../../util/lint';
import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {hiddenToken} from '../../mixin/hidden';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {Token} from '../index';

/** HTML注释，不可见 */
export abstract class CommentToken extends hiddenToken(NowikiBaseToken) {
	override readonly type = 'comment';
	closed;

	/* NOT FOR BROWSER */

	/** 内部文本 */
	override get innerText(): string {
		return super.innerText;
	}

	override set innerText(text) {
		this.setText(text);
	}

	/* NOT FOR BROWSER END */

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(wikitext, config, accum);
		this.closed = closed;
		Object.defineProperty(this, 'closed', {enumerable: false});
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 4 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return this.closed ? [] : [generateForSelf(this, {start}, Parser.msg('unclosed $1', 'HTML comment'))];
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		if (!this.closed && this.nextSibling) {
			Parser.error('自动闭合HTML注释', this);
			this.closed = true;
		}
		return omit && this.matchesTypes(omit) ? '' : `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}

	/** @override */
	override print(): string {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override json(): object {
		return {
			...super.json(),
			closed: this.closed,
		};
	}

	/** @override */
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return Shadow.run(() => new CommentToken(this.innerText, this.closed, this.getAttribute('config')) as this);
	}

	/**
	 * @override
	 * @throws `RangeError` 不允许包含`-->`
	 */
	override setText(text: string): string {
		if (text.includes('-->')) {
			throw new RangeError('不允许包含 "-->"！');
		}
		return super.setText(text);
	}
}

classes['CommentToken'] = __filename;
