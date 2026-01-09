import {
	getRegex,
	lintJSONNative,
} from '@bhsd/common';
import {generateForSelf, fixByRemove} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {
	AttributesToken,
	ExtToken,
} from '../../internal';

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
					innerText,
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
				if (
					// eslint-disable-next-line @stylistic/no-extra-parens
					name === 'templatedata' && (
						sSyntax
					)
				) {
					// browser版本使用`lintJSONNative()`
					return lintJSONNative(
						innerText,
					).map(({
						message,
						position,
						line,
						column,
					}): LintError | false => {
						s =
							sSyntax;
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
			}
			return super.lint(start, getLintRegex(name));
		}
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}
}
