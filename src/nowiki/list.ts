import {generateForSelf} from '../../util/lint';
import Parser from '../../index';
import {ListBaseToken} from './listBase';
import type {LintError, TokenTypes} from '../../base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {syntax} from '../../mixin/syntax';
import type {SyntaxBase} from '../../mixin/syntax';

export interface ListToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

const linkTypes = new Set<TokenTypes | 'text' | undefined>(['link', 'category', 'file']);

/**
 * `;:*#` at the start of a line
 *
 * 位于行首的`;:*#`
 */
@sol(true) @syntax(/^[;:*#]+[^\S\n]*$/u)
export abstract class ListToken extends ListBaseToken {
	override get type(): 'list' {
		return 'list';
	}

	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const rule = 'syntax-like',
				s = Parser.lintConfig.getSeverity(rule, 'redirect'),
				{innerText} = this;
			if (s && innerText === '#') {
				let {nextSibling} = this;
				if (nextSibling?.type === 'list-range') {
					nextSibling = nextSibling.firstChild;
				}
				if (nextSibling?.type === 'text' && linkTypes.has(nextSibling.nextSibling?.type)) {
					/^redirect\s*(?::\s*)?$/iu; // eslint-disable-line @typescript-eslint/no-unused-expressions
					const re = new RegExp(
						String.raw`^(?:${this.getAttribute('config').redirection.join('|')})\s*(?::\s*)?$`,
						'iu',
					);
					if (re.test(`#${nextSibling.data}`)) {
						const e = generateForSelf(nextSibling, {start: start + 1}, rule, 'redirect-like', s);
						e.startIndex--;
						e.startCol--;
						e.endIndex += 2;
						e.endCol += 2;
						return [e];
					}
				}
			}
			return [];
		}
	}
}

classes['ListToken'] = __filename;
