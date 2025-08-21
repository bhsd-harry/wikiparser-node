import {generateForSelf, fixByClose} from '../../util/lint';
import {hiddenToken} from '../../mixin/hidden';
import {padded} from '../../mixin/padded';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError, Config} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
 * invisible HTML comment
 *
 * HTML注释，不可见
 */
@hiddenToken(false) @padded('<!--')
export abstract class CommentToken extends NowikiBaseToken {
	closed;

	override get type(): 'comment' {
		return 'comment';
	}

	/* NOT FOR BROWSER */

	/** comment content / 内部文本 */
	override get innerText(): string {
		return super.innerText;
	}

	override set innerText(text) {
		this.setText(text);
	}

	/* NOT FOR BROWSER END */

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed: boolean, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			if (this.closed) {
				return [];
			}
			const rule = 'unclosed-comment',
				s = Parser.lintConfig.getSeverity(rule);
			if (!s) {
				return [];
			}
			const e = generateForSelf(this, {start}, rule, Parser.msg('unclosed', 'html-comment'), s);
			e.suggestions = [fixByClose(e.endIndex, '-->')];
			return [e];
		}
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
		return Shadow.run(
			// @ts-expect-error abstract class
			(): this => new CommentToken(this.innerText, this.closed, this.getAttribute('config')),
		);
	}

	/** @private */
	override setText(text: string): string {
		/* istanbul ignore if */
		if (text.includes('-->')) {
			throw new RangeError('Do not contain "-->" in the comment!');
		}
		return super.setText(text);
	}
}

classes['CommentToken'] = __filename;
