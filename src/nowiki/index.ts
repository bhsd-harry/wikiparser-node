import {getRegex} from '@bhsd/common';
import {generateForSelf, fixByRemove} from '../../util/lint';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

/* NOT FOR BROWSER ONLY */

import {
	mathTags,

	/* NOT FOR BROWSER */

	classes,
} from '../../util/constants';
import {texvcjs} from '../../lib/document';
import type {TexvcLocation} from '../../lib/document';

/** @ignore */
const updateLocation = (
	{startIndex, startLine, startCol, endIndex, endCol}: LintError,
	{offset, line, column}: TexvcLocation,
	isChem: boolean,
): [number, number, number] => {
	const n = isChem ? 4 : 0,
		index = startIndex + offset - n,
		beyond = index > endIndex;
	return [
		beyond ? endIndex : index,
		startLine + line - 1,
		beyond ? endCol : (line === 1 ? startCol - n : 0) + column - 1,
	];
};

/* NOT FOR BROWSER ONLY END */

/<\s*(?:\/\s*)?(nowiki)\b/giu; // eslint-disable-line @typescript-eslint/no-unused-expressions
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
		LINT: { // eslint-disable-line no-unused-labels
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

			rule = 'invalid-math';
			s = lintConfig.getSeverity(rule);
			if (s && texvcjs && mathTags.has(name)) {
				const isChem = name !== 'math',
					result = texvcjs.check(
						isChem ? String.raw`\ce{${innerText}}` : innerText,
						{usemhchem: isChem || Boolean(previousSibling?.hasAttr('chem'))},
					);
				if (result.status !== '+') {
					const e = generateForSelf(this, {start}, rule, 'chem-required', s);
					if (result.status !== 'C') {
						const {error: {message, location}} = result;
						e.message = message;
						[e.endIndex, e.endLine, e.endCol] = updateLocation(e, location.end, isChem);
						[e.startIndex, e.startLine, e.startCol] = updateLocation(e, location.start, isChem);
					}
					errors.push(e);
				}
			}

			/* NOT FOR BROWSER ONLY END */

			return errors;
		}
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}
}

classes['NowikiToken'] = __filename;
