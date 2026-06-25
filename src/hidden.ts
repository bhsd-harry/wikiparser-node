import {generateForSelf, fixByRemove, fixByEscape} from '../util/lint';
import {hiddenToken} from '../mixin/hidden';
import {noEscape} from '../mixin/noEscape';
import Parser from '../index';
import {Token} from './index';
import type {
	LintError,
} from '../base';

/**
 * invisible token in triple braces
 *
 * 三重括号内不可见的节点
 */
@hiddenToken(false) @noEscape
export class HiddenToken extends Token {
	override get type(): 'hidden' {
		return 'hidden';
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const rule = 'no-ignored',
				{lintConfig} = Parser,
				s = lintConfig.getSeverity(rule, 'arg');
			if (s) {
				const e = generateForSelf(this, {start}, rule, 'invisible-triple-braces', s);
				e.startIndex--;
				e.startCol--;
				if (lintConfig.computeEditInfo) {
					e.suggestions = [
						fixByRemove(e),
						fixByEscape(e.startIndex, '{{!}}'),
					];
				}
				return [e];
			}
			return [];
		}
	}
}
