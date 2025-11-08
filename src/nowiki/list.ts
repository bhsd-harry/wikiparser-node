import {generateForSelf} from '../../util/lint';
import Parser from '../../index';
import {ListBaseToken} from './listBase';
import type {LintError, TokenTypes} from '../../base';

const linkTypes = new Set<TokenTypes | 'text' | undefined>(['link', 'category', 'file']);

/**
 * `;:*#` at the start of a line
 *
 * 位于行首的`;:*#`
 */
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
				// eslint-disable-next-line prefer-const
				let {nextSibling} = this;
				if (nextSibling?.type === 'text' && linkTypes.has(nextSibling.nextSibling?.type)) {
					/^redirect\s*(?::\s*)?$/iu; // eslint-disable-line @typescript-eslint/no-unused-expressions
					const re = new RegExp(
						String.raw`^(?:${
							this.getAttribute('config').redirection.join('|')
						})\s*(?::\s*)?$`,
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
