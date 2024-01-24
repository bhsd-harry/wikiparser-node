import {generateForSelf} from '../../util/lint';
import {LinkBaseToken} from './base';
import type {LintError} from '../../base';
import type {Token, AtomToken} from '../../internal';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class LinkToken extends LinkBaseToken {
	override readonly type = 'link';

	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		if (this.closest('ext-link-text')) {
			errors.push(generateForSelf(this, {start}, 'internal link in an external link'));
		}
		return errors;
	}
}
