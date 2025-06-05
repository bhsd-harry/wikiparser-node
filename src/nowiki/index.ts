import {getRegex} from '@bhsd/common';
import {generateForSelf} from '../../util/lint';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/<\s*(?:\/\s*)?(nowiki)\b/giu; // eslint-disable-line @typescript-eslint/no-unused-expressions
const getLintRegex = getRegex(
	name => new RegExp(String.raw`<\s*(?:/\s*)${name === 'nowiki' ? '' : '?'}(${name})\b`, 'giu'),
);
const voidExt = new Set(['templatestyles', 'section', 'languages']);

/**
 * text-only token inside an extension tag
 *
 * 扩展标签内的纯文字Token
 */
export abstract class NowikiToken extends NowikiBaseToken {
	declare readonly name: string;

	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** 扩展标签内的无效内容 */
	#lint(): boolean {
		const {name, firstChild: {data}} = this;
		return voidExt.has(name) && Boolean(data);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {name} = this;
		if (this.#lint()) {
			const e = generateForSelf(
				this,
				{start},
				'void-ext',
				Parser.msg('nothing should be in <$1>', name),
			);
			e.fix = {range: [start, e.endIndex], text: '', desc: 'empty'};
			return [e];
		}
		return super.lint(start, getLintRegex(name));
	}

	/* NOT FOR BROWSER */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}
}

classes['NowikiToken'] = __filename;
