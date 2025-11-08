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
		LINT: return this.length > 1
			? this.lastChild.text()
			: rawurldecode(this.firstChild.text().replace(/^\s*:?/u, ''));
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				rule = 'nested-link',
				{lintConfig} = Parser,
				s = lintConfig.getSeverity(rule);
			if (s && this.isInside('ext-link-text')) {
				const e = generateForSelf(this, {start}, rule, 'link-in-extlink', s);
				if (lintConfig.computeEditInfo || lintConfig.fix) {
					e.fix = fixBy(e, 'delink', this.innerText);
				}
				errors.push(e);
			}
			return errors;
		}
	}
}
