import {generateForSelf} from '../../util/lint';
import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError, Config} from '../../base';
import type {Token} from '../index';

/** HTML注释，不可见 */
@hiddenToken(false)
export abstract class CommentToken extends NowikiBaseToken {
	closed;

	override get type(): 'comment' {
		return 'comment';
	}

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
	constructor(wikitext: string, closed = true, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding' ? 4 as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		if (this.closed) {
			return [];
		}
		const e = generateForSelf(this, {start}, 'unclosed-comment', Parser.msg('unclosed $1', 'HTML comment'));
		e.fix = {
			range: [e.endIndex, e.endIndex],
			text: '-->',
		};
		return [e];
	}

	/** @private */
	override toString(skip?: boolean): string {
		/* NOT FOR BROWSER */

		if (!this.closed && this.nextSibling) {
			Parser.error('Auto-closing HTML comment', this);
			this.closed = true;
		}

		/* NOT FOR BROWSER END */

		return skip ? '' : `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}

	/** @private */
	override print(): string {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		// @ts-expect-error abstract class
		return Shadow.run(() => new CommentToken(this.innerText, this.closed, this.getAttribute('config')) as this);
	}

	/** @private */
	override setText(text: string): string {
		if (text.includes('-->')) {
			throw new RangeError('Do not contain "-->" in the comment!');
		}
		return super.setText(text);
	}
}

classes['CommentToken'] = __filename;
