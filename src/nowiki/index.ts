import {getRegex} from '@bhsd/common';
import {generateForSelf} from '../../util/lint';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

const getLintRegex = getRegex(
	name => new RegExp(String.raw`<\s*(?:/\s*)${name === 'nowiki' ? '' : '?'}(${name})\b`, 'giu'),
);

/**
 * text-only token inside an extension tag
 *
 * 扩展标签内的纯文字Token
 */
export abstract class NowikiToken extends NowikiBaseToken {
	declare readonly name: string;

	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {name, firstChild: {data}} = this;
		if ((name === 'templatestyles' || name === 'section') && data) {
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
}
