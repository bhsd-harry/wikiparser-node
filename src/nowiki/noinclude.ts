import {generateForSelf, fixByRemove} from '../../util/lint';
import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,
} from '../../base';

/**
 * `<noinclude>` or `</noinclude>` that allows no modification
 *
 * `<noinclude>`或`</noinclude>`，不可进行任何更改
 */
@hiddenToken(false)
export abstract class NoincludeToken extends NowikiBaseToken {
	override get type(): 'noinclude' {
		return 'noinclude';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : super.toString();
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const {lintConfig} = Parser,
				rule = 'no-ignored',
				s = lintConfig.getSeverity(rule, 'include');
			if (s) {
				const {innerText} = this,
					mt = /^<(includeonly|(?:no|only)include)\s+(?:[^\s>/]|\/(?!>))[^>]*>$/iu.exec(innerText);
				if (mt) {
					const e = generateForSelf(this, {start}, rule, 'useless-attribute', s),
						{computeEditInfo} = lintConfig,
						before = mt[1]!.length + 1,
						after = innerText.endsWith('/>') ? 2 : 1;
					e.startIndex += before;
					e.startCol += before;
					e.endIndex -= after;
					e.endCol -= after;
					if (computeEditInfo) {
						e.suggestions = [fixByRemove(e)];
					}
					return [e];
				}
			}
			return [];
		}
	}
}
