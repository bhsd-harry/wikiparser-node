import {rawurldecode} from '@bhsd/common';
import {generateForSelf, fixBy} from '../../util/lint';
import Parser from '../../index';
import {LinkBaseToken} from './base';
import type {LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * internal link
 *
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class LinkToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
	abstract override get link(): Title;

	override get type(): 'link' {
		return 'link';
	}

	/** link text / 链接显示文字 */
	get innerText(): string {
		LINT: return this.length > 1 // eslint-disable-line no-unused-labels
			? this.lastChild.text()
			: rawurldecode(this.firstChild.text().replace(/^\s*:?/u, ''));
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				rule = 'nested-link',
				s = Parser.lintConfig.getSeverity(rule);
			if (s && this.closest('ext-link-text')) {
				const e = generateForSelf(this, {start}, rule, 'link-in-extlink', s);
				e.fix = fixBy(e, 'delink', this.innerText);
				errors.push(e);
			}
			return errors;
		}
	}
}
