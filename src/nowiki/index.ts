import {getRegex} from '@bhsd/common';
import {generateForSelf, fixByRemove} from '../../util/lint';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {
	AttributesToken,
	ExtToken,
} from '../../internal';

/* NOT FOR BROWSER ONLY */

import {
	mathTags,
} from '../../util/constants';
import {loadTexvcjs} from '../../lib/document';
import type {TexvcLocation} from '../../lib/document';

/** @ignore */
const updateLocation = (
	{startIndex, startLine, startCol, endIndex, endLine, endCol}: LintError,
	{offset, line, column}: TexvcLocation,
	n: number,
): [number, number, number] => {
	const index = startIndex + offset - n;
	if (index < startIndex) {
		return [startIndex, startLine, startCol];
	} else if (index > endIndex) {
		return [endIndex, endLine, endCol];
	}
	return [index, startLine + line - 1, (line === 1 ? startCol - n : 0) + column - 1];
};

/* NOT FOR BROWSER ONLY END */

const getLintRegex = /* #__PURE__ */ getRegex(
	name => new RegExp(String.raw`<\s*(?:/\s*)${name === 'nowiki' ? '' : '?'}(${name})\b`, 'giu'),
);
const voidExt = new Set(['languages', 'section', 'templatestyles']);

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
		LINT: {
			const {
					name,

					/* NOT FOR BROWSER ONLY */

					innerText,
					previousSibling,
				} = this,
				{lintConfig} = Parser;
			let rule: LintError.Rule = 'void-ext',
				s = lintConfig.getSeverity(rule, name);
			if (s && this.#lint()) {
				const e = generateForSelf(this, {start}, rule, Parser.msg('nothing-in', name), s);
				if (lintConfig.computeEditInfo) {
					e.suggestions = [fixByRemove(e)];
				}
				return [e];
			}
			const errors = super.lint(start, getLintRegex(name));

			/* NOT FOR BROWSER ONLY */

			NPM: {
				rule = 'invalid-math';
				s = lintConfig.getSeverity(rule);
				if (s && mathTags.has(name)) {
					const texvcjs = loadTexvcjs();
					if (texvcjs) {
						const isChem = name !== 'math',
							display = previousSibling?.getAttr('display') ?? 'block';
						let tex = innerText,
							n = 0;
						if (isChem) {
							tex = String.raw`\ce{${tex}}`;
							n = 4;
						}
						switch (display) {
							case 'block':
								tex = String.raw`{\displaystyle ${tex}}`;
								n += 15;
								break;
							case 'inline':
								tex = String.raw`{\textstyle ${tex}}`;
								n += 12;
								break;
							case 'linebreak':
								tex = String.raw`\[ ${tex} \]`;
								n += 3;
								// no default
						}
						const result = texvcjs.check(tex, {
							usemhchem: isChem || Boolean(previousSibling?.hasAttr('chem')),
						});
						if (result.status !== '+') {
							const e = generateForSelf(this, {start}, rule, 'chem-required', s);
							if (result.status !== 'C') {
								const {message, location} = result.error,
									[endIndex, endLine, endCol] = updateLocation(e, location.end, n);
								[e.startIndex, e.startLine, e.startCol] = updateLocation(e, location.start, n);
								Object.assign(e, {endIndex, endLine, endCol, message});
							}
							errors.push(e);
						}
					}
				}
			}

			/* NOT FOR BROWSER ONLY END */

			return errors;
		}
	}
}
