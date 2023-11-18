import {generateForSelf} from '../../util/lint';
import {hidden} from '../../mixin/hidden';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../index';
import type {Token} from '..';

/** HTML注释，不可见 */
export abstract class CommentToken extends hidden(NowikiBaseToken) {
	/** @browser */
	override readonly type = 'comment';
	closed;

	/**
	 * @browser
	 * @param closed 是否闭合
	 */
	constructor(wikitext: string, closed = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @private */
	protected override getPadding(): number {
		return 4;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return this.closed ? [] : [generateForSelf(this, {start}, 'unclosed HTML comment')];
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return `<!--${this.firstChild.data}${this.closed ? '-->' : ''}`;
	}
}
