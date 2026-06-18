import {generateForSelf, fixByRemove} from '../util/lint';
import {extParams} from '../util/sharable';
import Parser from '../index';
import {Token} from './index';
import type {Config, LintError} from '../base';
import type {ParamTagToken, SeoToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

const skipTypes = new Set(['comment', 'include', 'noinclude']);

/**
 * parameter of certain extension tags
 *
 * 某些扩展标签的参数
 */
export abstract class ParamLineToken extends Token {
	#delimiter;

	abstract override get parentNode(): ParamTagToken | SeoToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): this | undefined;

	/* NOT FOR BROWSER */

	abstract override get parentElement(): ParamTagToken | SeoToken | undefined;
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
		delimiter: '\n' | '|',
		config: Config,
		accum: Token[],
		acceptable: WikiParserAcceptable = {AstText: ':'}, // eslint-disable-line unicorn/no-object-as-default-parameter
	) {
		super(wikitext, config, accum, acceptable);
		this.#delimiter = delimiter;
		this.setAttribute('name', name);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: {
			const rule = 'no-ignored',
				{lintConfig} = Parser,
				{name, childNodes, previousSibling} = this,
				s = lintConfig.getSeverity(rule, name);
			if (!s) {
				return [];
			}
			const msg = Parser.msg('invalid-parameter', name);
			if (childNodes.some(({type}) => type === 'ext')) {
				return [generateForSelf(this, {start}, rule, msg, s)];
			}
			const children = childNodes.filter(({type}) => !skipTypes.has(type)),
				i = children.findIndex(({type}) => type !== 'text');
			let str = children.slice(0, i === -1 ? undefined : i).map(String).join('').trim();
			if (str) {
				if (name === 'inputbox') {
					str = str.toLowerCase();
				}
				const j = str.indexOf('='),
					key = str.slice(0, j === -1 ? undefined : j).trim(),
					params = extParams[name!]!;
				if (
					j === -1
						? i === -1 || !params.some(p => p.startsWith(key))
						: !params.some(
							p => p === key
								|| p.endsWith('$1') && key.startsWith(p.slice(0, -2)),
						)
				) {
					const e = generateForSelf(this, {start}, rule, msg, s);
					if (lintConfig.computeEditInfo) {
						e.suggestions = [fixByRemove(e, previousSibling ? -1 : 0)];
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
			this.#delimiter,
			this.getAttribute('config'),
			[],
			this.getAcceptable(),
		) as this;
	}

	/**
	 * 转义字符串以规避参数分隔符
	 * @param str 待转义的字符串
	 */
	#escape(str: string): string {
		return this.#delimiter === '\n'
			? str.replaceAll('\n', ' ')
			: str.replaceAll('|', '{{!}}');
	}

	/** @private */
	override toString(skip?: boolean): string {
		return this.childNodes.map(child => {
			const str = child.toString(skip);
			return child.type === 'text' ? this.#escape(str) : str;
		}).join('');
	}

	/** @private */
	override text(): string {
		return this.childNodes.map(child => {
			const str = child.text();
			return child.type === 'text' ? this.#escape(str) : str;
		}).join('');
	}
}

classes['ParamLineToken'] = __filename;
