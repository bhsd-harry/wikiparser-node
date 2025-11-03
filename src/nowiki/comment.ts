import {generateForSelf, fixByClose} from '../../util/lint';
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
		LINT: {
			if (this.closed) {
				return [];
			}
			const rule = 'unclosed-comment',
				{lintConfig} = Parser,
				s = lintConfig.getSeverity(rule);
			/* istanbul ignore if */
			if (!s) {
				return [];
			}
			const e = generateForSelf(this, {start}, rule, 'unclosed-comment', s);
			if (lintConfig.computeEditInfo) {
				e.suggestions = [fixByClose(e.endIndex, '-->')];
			}
			return [e];
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}

	/** @private */
	override print(): string {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}
}
