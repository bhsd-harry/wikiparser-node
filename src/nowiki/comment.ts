import {generateForSelf} from '../../util/lint';
import {hiddenToken} from '../../mixin/hidden';
import {padded} from '../../mixin/padded';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError, Config} from '../../base';
import type {Token} from '../../internal';

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

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed: boolean, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		if (this.closed) {
			return [];
		}
		const e = generateForSelf(
			this,
			{start},
			'unclosed-comment',
			Parser.msg('unclosed $1', 'HTML comment'),
		);
		e.suggestions = [{range: [e.endIndex, e.endIndex], text: '-->', desc: 'close'}];
		return [e];
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}
}
