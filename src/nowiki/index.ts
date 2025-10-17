import {getRegex} from '@bhsd/common';
import {generateForSelf, fixByRemove} from '../../util/lint';
import Parser from '../../index';
import {NowikiBaseToken} from './base';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

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
		LINT: { // eslint-disable-line no-unused-labels
			const {
					name,
				} = this,
				{lintConfig} = Parser;
			/* eslint-disable prefer-const */
			let rule: LintError.Rule = 'void-ext',
				s = lintConfig.getSeverity(rule, name);
			/* eslint-enable prefer-const */
			if (s && this.#lint()) {
				const e = generateForSelf(this, {start}, rule, Parser.msg('nothing-in', name), s);
				if (lintConfig.computeEditInfo) {
					e.suggestions = [fixByRemove(e)];
				}
				return [e];
			}
			const errors = super.lint(start, getLintRegex(name));
			return errors;
		}
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}
}
