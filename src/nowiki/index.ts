import {generateForSelf} from '../../util/lint';
import {classes} from '../../util/constants';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

/** 扩展标签内的纯文字Token */
export abstract class NowikiToken extends NowikiBaseToken {
	override readonly type = 'ext-inner';
	declare readonly name: string;

	abstract override get nextSibling(): undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {name, firstChild: {data}} = this;
		return (name === 'templatestyles' || name === 'section') && data
			? [generateForSelf(this, {start}, Parser.msg('nothing should be in <$1>', name))]
			: super.lint(start);
	}
}

classes['NowikiToken'] = __filename;
