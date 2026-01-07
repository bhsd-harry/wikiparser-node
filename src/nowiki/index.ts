import {
	getRegex,
	lintJSON,
} from '@bhsd/common';
import {generateForSelf, fixByRemove} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {
	AttributesToken,
	ExtToken,

	/* NOT FOR BROWSER */

	AstNodes,
} from '../../internal';

/* NOT FOR BROWSER ONLY */

import {
	mathTags,

	/* NOT FOR BROWSER */

	classes,
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
		LINT: {
			const {
					name,
					innerText,

					/* NOT FOR BROWSER ONLY */

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

			NPM: {
				rule = 'invalid-json';
				const sSyntax = lintConfig.getSeverity(rule);

				/* NOT FOR BROWSER ONLY */

				const sDuplicate = lintConfig.getSeverity(rule, 'duplicate');

				/* NOT FOR BROWSER ONLY END */

				if (
					name === 'templatedata' && (
						sSyntax
						|| sDuplicate
					)
				) {
					// browser版本使用`lintJSONNative()`
					return lintJSON(
						innerText,
					).map((error): LintError | false => {
						const {
							message,
							position,
							line,
							column,

							/* NOT FOR BROWSER ONLY */

							severity,
						} = error;
						s =
							/* eslint-disable @stylistic/operator-linebreak */
							severity === 'warning' ?
								sDuplicate :
								/* eslint-enable @stylistic/operator-linebreak */
								sSyntax;
						if (!s) {
							return false;
						}
						const rect = new BoundingRect(this, start),
							startIndex = start + position,
							startLine = rect.top + line - 1,
							startCol = (line > 1 ? 0 : rect.left) + column - 1;
						return {
							rule,
							message,
							severity: s,
							startIndex,
							endIndex: startIndex,
							startLine,
							endLine: startLine,
							startCol,
							endCol: startCol,
						};
					}).filter((e): e is LintError => e !== false);
				}

				/* NOT FOR BROWSER ONLY */

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
						if (result.status === '+') {
							return [];
						}
						const e = generateForSelf(this, {start}, rule, 'chem-required', s);
						if (result.status !== 'C') {
							const {message, location} = result.error,
								[endIndex, endLine, endCol] = updateLocation(e, location.end, n);
							[e.startIndex, e.startLine, e.startCol] = updateLocation(e, location.start, n);
							Object.assign(e, {endIndex, endLine, endCol, message});
						}
						return [e];
					}
				}
			}

			/* NOT FOR BROWSER ONLY END */

			return super.lint(start, getLintRegex(name));
		}
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/** @private */
	override safeReplaceChildren(elements: readonly (AstNodes | string)[]): void {
		if (elements.length === 0) {
			this.setText('');
		} else {
			super.safeReplaceChildren(elements);
		}
	}
}

classes['NowikiToken'] = __filename;
