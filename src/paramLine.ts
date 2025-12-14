import {generateForSelf, fixByRemove} from '../util/lint';
import {extParams} from '../util/sharable';
import Parser from '../index';
import {Token} from './index';
import type {Config, LintError} from '../base';
import type {ParamTagToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {singleLine} from '../mixin/singleLine';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * parameter of certain extension tags
 *
 * 某些扩展标签的参数
 */
@singleLine
export abstract class ParamLineToken extends Token {
	abstract override get parentNode(): ParamTagToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): this | undefined;

	/* NOT FOR BROWSER */

	abstract override get parentElement(): ParamTagToken | undefined;
	abstract override get nextElementSibling(): this | undefined;
	abstract override get previousElementSibling(): this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'param-line' {
		return 'param-line';
	}

	/** @param name 扩展标签名 */
	constructor(
		name: string,
		wikitext: string | undefined,
		config: Config,
		accum: Token[],
		acceptable: WikiParserAcceptable,
	) {
		super(wikitext, config, accum, acceptable);
		this.setAttribute('name', name);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const rule = 'no-ignored',
				{lintConfig} = Parser,
				{name, childNodes} = this,
				s = lintConfig.getSeverity(rule, name);
			if (!s) {
				return [];
			}
			const msg = Parser.msg('invalid-parameter', name);
			if (childNodes.some(({type}) => type === 'ext')) {
				return [generateForSelf(this, {start}, rule, msg, s)];
			}
			const children = childNodes
					.filter(({type}) => type !== 'comment' && type !== 'include' && type !== 'noinclude'),
				isInputbox = name === 'inputbox',
				i = isInputbox ? children.findIndex(({type}) => type !== 'text') : -1;
			let str = children.slice(0, i === -1 ? undefined : i).map(String).join('').trim();
			if (str) {
				if (isInputbox) {
					str = str.toLowerCase();
				}
				const j = str.indexOf('='),
					key = str.slice(0, j === -1 ? undefined : j).trim(),
					params = extParams[name!]!;
				if (j === -1 ? i === -1 || !params.some(p => p.startsWith(key)) : !params.includes(key)) {
					const e = generateForSelf(this, {start}, rule, msg, s);
					if (lintConfig.computeEditInfo) {
						e.suggestions = [fixByRemove(e)];
					}
					return [e];
				}
			}
			return super.lint(start, false);
		}
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new ParamLineToken(
			this.name,
			undefined,
			this.getAttribute('config'),
			[],
			this.getAcceptable(),
		) as this;
	}
}

classes['ParamLineToken'] = __filename;
