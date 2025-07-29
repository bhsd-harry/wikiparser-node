import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/**
 * invisible HTML comment
 *
 * HTML注释，不可见
 */
@hiddenToken(false)
export abstract class CommentToken extends NowikiBaseToken {
	closed;

	override get type(): 'comment' {
		return 'comment';
	}

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed: boolean, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}
}
