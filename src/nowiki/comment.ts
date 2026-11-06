import {hiddenToken} from '../../mixin/hidden';
import {padded} from '../../mixin/padded';
import {NowikiBaseToken} from './base';
import type {
	Config,
} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';

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

	/* NOT FOR BROWSER END */

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed: boolean, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		return Shadow.run(
			// @ts-expect-error abstract class
			(): this => new CommentToken(this.innerText, this.closed, this.getAttribute('config')),
		);
	}
}
