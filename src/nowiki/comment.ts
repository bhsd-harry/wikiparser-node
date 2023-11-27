import {generateForSelf} from '../../util/lint';
import {hidden} from '../../mixin/hidden';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../index';
import type {Token} from '../index';

/** HTML注释，不可见 */
// @ts-expect-error not implementing all abstract methods
export class CommentToken extends hidden(NowikiBaseToken) {
	override readonly type = 'comment';
	closed;

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @private */
	protected override getPadding(): number {
		return 4;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return this.closed ? [] : [generateForSelf(this, {start}, 'unclosed HTML comment')];
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}
}
