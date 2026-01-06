import {getRegex, lintJSON} from '@bhsd/common';
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
			rule = 'invalid-json';
			s = lintConfig.getSeverity(rule);
			if (s && name === 'templatedata') {
				const [error] = lintJSON(innerText);
				if (!error) {
					return [];
				}
				const {message, position} = error;
				let {line, column} = error,
					startIndex = start,
					{top, left} = new BoundingRect(this, start);
				if (position !== null) {
					startIndex += position;
					if (!line || !column) {
						const pos = this.posFromIndex(position)!;
						line ??= pos.top + 1;
						column ??= pos.left + 1;
					}
				} else if (line && column) {
					startIndex += this.indexFromPos(line - 1, column - 1)!;
				}
				if (line) {
					top += line - 1;
					if (line > 1) {
						left = 0;
					}
					if (column) {
						left += column - 1;
					}
				}
				return [
					{
						rule,
						message,
						severity: s,
						startIndex,
						endIndex: startIndex,
						startLine: top,
						endLine: top,
						startCol: left,
						endCol: left,
					},
				];
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
