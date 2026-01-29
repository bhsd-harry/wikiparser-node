import {generateForSelf, fixByRemove} from '../../util/lint';
import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {
	LintError,

	/* NOT FOR BROWSER */

	Config,
} from '../../base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {Shadow} from '../../util/debug';
import type {Token} from '../../internal';

/* NOT FOR BROWSER END */

/**
 * `<noinclude>` or `</noinclude>` that allows no modification
 *
 * `<noinclude>`或`</noinclude>`，不可进行任何更改
 */
@hiddenToken(false)
export abstract class NoincludeToken extends NowikiBaseToken {
	/* NOT FOR BROWSER */

	#fixed;

	/* NOT FOR BROWSER END */

	override get type(): 'noinclude' {
		return 'noinclude';
	}

	/* NOT FOR BROWSER */

	/** @param fixed 是否不可更改 */
	constructor(wikitext: string, config?: Config, accum?: Token[], fixed = false) {
		super(wikitext, config, accum);
		this.#fixed = fixed;
	}

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		return Shadow.run(() => {
			const C = this.constructor as new (...args: any[]) => this;
			return new C(this.innerText, this.getAttribute('config'), [], this.#fixed);
		});
	}

	/* c8 ignore start */
	override setText(str: string): string {
		return this.#fixed ? this.constructorError('cannot change the text content') : super.setText(str);
	}
	/* c8 ignore stop */
}

classes['NoincludeToken'] = __filename;
