import {generateForSelf} from '../../util/lint';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../index';
import type {AttributesToken, ExtToken} from '../../internal';

/** 扩展标签内的纯文字Token */
export abstract class NowikiToken extends NowikiBaseToken {
	/** @browser */
	override readonly type = 'ext-inner';
	declare name: string;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {name} = this;
		return (name === 'templatestyles' || name === 'section') && this.firstChild.data
			? [generateForSelf(this, {start}, Parser.msg('nothing should be in <$1>', name))]
			: super.lint(start);
	}
}
