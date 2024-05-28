import {generateForSelf} from '../../util/lint';
import {classes} from '../../util/constants';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

/** 扩展标签内的纯文字Token */
export abstract class NowikiToken extends NowikiBaseToken {
	override readonly type = 'ext-inner';
	declare readonly name: string;

	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {name, firstChild: {data}} = this;
		if ((name === 'templatestyles' || name === 'section') && data) {
			const e = generateForSelf(this, {start}, 'void-ext', Parser.msg('nothing should be in <$1>', name));
			e.fix = {
				range: [start - 1, e.endIndex + name.length + 3],
				text: '/>',
			};
			return [e];
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		/<\s*(?:\/\s*)?(nowiki)\b/giu;
		return super.lint(start, new RegExp(`<\\s*(?:\\/\\s*)${name === 'nowiki' ? '' : '?'}(${name})\\b`, 'giu'));
	}
}

classes['NowikiToken'] = __filename;
