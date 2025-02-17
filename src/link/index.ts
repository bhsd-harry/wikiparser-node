import {generateForSelf} from '../../util/lint';
import {LinkBaseToken} from './base';
import type {LintError} from '../../base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class LinkToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
	abstract override get link(): Title;

	override get type(): 'link' {
		return 'link';
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		if (this.closest('ext-link-text')) {
			errors.push(generateForSelf(this, {start}, 'nested-link', 'internal link in an external link'));
		}
		return errors;
	}
}
