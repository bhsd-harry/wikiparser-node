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
		return skip ? '' : `<!--${this.innerText}${this.closed ? '-->' : ''}`;
	}
}
