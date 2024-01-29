import {generateForSelf} from '../../util/lint';
import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {Token} from '../index';

/** HTML注释，不可见 */
export abstract class CommentToken extends hiddenToken(NowikiBaseToken) {
	override readonly type = 'comment';
	closed;

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(wikitext, config, accum);
		this.closed = closed;
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
	override toString(): string {
		return `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}
}
