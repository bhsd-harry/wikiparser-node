import {generateForSelf} from '../../util/lint';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../index';
import type {AttributesToken, ExtToken} from '../../internal';

/** 扩展标签内的纯文字Token */
// @ts-expect-error not implementing all abstract methods
export class NowikiToken extends NowikiBaseToken {
	/** @browser */
	override readonly type = 'ext-inner';
	declare name: string;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | undefined;

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {name, firstChild} = this;
		return (name === 'templatestyles' || name === 'section') && firstChild.data
			? [generateForSelf(this, {start}, Parser.msg('nothing should be in <$1>', name))]
			: super.lint(start);
	}
}
