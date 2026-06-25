import {generateForSelf, fixByRemove, fixByEscape} from '../util/lint';
import {hiddenToken} from '../mixin/hidden';
import {noEscape} from '../mixin/noEscape';
import Parser from '../index';
import {Token} from './index';
import type {
	LintError,

	/* NOT FOR BROWSER */

	Config,
} from '../base';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

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

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		PRINT: if (key === 'invalid') {
			return true as TokenAttribute<T>;
		}
		return super.getAttribute(key);
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/** @class */
	constructor(wikitext?: string, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum, {
			'Stage-2': ':', '!HeadingToken': '',
		});
	}

	@clone
	override cloneNode(): this {
		return new HiddenToken(undefined, this.getAttribute('config')) as this;
	}
}

classes['HiddenToken'] = __filename;
