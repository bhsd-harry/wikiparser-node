import {
	text,
	removeComment,
	print,
} from '../util/string';
import Parser from '../index';
import {Token} from './index';
import {ConverterFlagsToken} from './converterFlags';
import {ConverterRuleToken} from './converterRule';

/* NOT FOR BROWSER */

import {html} from '../util/html';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {flagsParent} from '../mixin/flagsParent';
import type {FlagsParentBase} from '../mixin/flagsParent';

export interface ConverterToken extends FlagsParentBase {}

/* NOT FOR BROWSER END */

/**
 * language conversion
 *
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken[]]}`
 */
@flagsParent
export abstract class ConverterToken extends Token {
	declare readonly childNodes: readonly [ConverterFlagsToken, ConverterRuleToken, ...ConverterRuleToken[]];
	abstract override get firstChild(): ConverterFlagsToken;
	abstract override get lastChild(): ConverterFlagsToken | ConverterRuleToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [ConverterFlagsToken, ConverterRuleToken, ...ConverterRuleToken[]];
	abstract override get firstElementChild(): ConverterFlagsToken;
	abstract override get lastElementChild(): ConverterFlagsToken | ConverterRuleToken;

	/* NOT FOR BROWSER END */

	override get type(): 'converter' {
		return 'converter';
	}

	/* NOT FOR BROWSER */

	/** whether to prevent language conversion / 是否不转换 */
	get noConvert(): boolean {
		return this.hasFlag('R') || this.length === 2 && this.lastChild.length === 1;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param flags 转换类型标记
	 * @param rules 转换规则
	 */
	constructor(
		flags: readonly string[],
		rules: readonly [string, ...string[]],
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(undefined, config, accum);
		// @ts-expect-error abstract class
		this.append(new ConverterFlagsToken(flags, config, accum) as ConverterFlagsToken);
		const [firstRule] = rules,
			hasColon = firstRule.includes(':'),
			// @ts-expect-error abstract class
			firstRuleToken: ConverterRuleToken = new ConverterRuleToken(firstRule, hasColon, config, accum);
		if (
			hasColon && firstRuleToken.length === 1
			|| !hasColon && rules.length === 2 && !removeComment(rules[1]!).trim()
		) {
			this.insertAt(
				// @ts-expect-error abstract class
				new ConverterRuleToken(rules.join(';'), false, config, accum) as ConverterRuleToken,
			);
		} else {
			this.append(
				firstRuleToken,
				...rules.slice(1)
					// @ts-expect-error abstract class
					.map(rule => new ConverterRuleToken(rule, true, config, accum) as ConverterRuleToken),
			);
		}

		/* NOT FOR BROWSER */

		this.protectChildren(0);
	}

	/** @private */
	override toString(skip?: boolean): string {
		const {childNodes: [flags, ...rules]} = this;
		return `-{${flags.toString(skip)}${flags.length > 0 ? '|' : ''}${
			rules.map(rule => rule.toString(skip)).join(';')
		}}-`;
	}

	/** @private */
	override text(): string {
		const {childNodes: [flags, ...rules]} = this;
		return `-{${flags.text()}|${text(rules, ';')}}-`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding' ? 2 as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(i: number): number {
		return i || this.firstChild.length > 0 ? 1 : 0;
	}

	/** @private */
	override print(): string {
		const {childNodes: [flags, ...rules]} = this;
		return `<span class="wpb-converter">-{${flags.print()}${
			flags.length > 0 ? '|' : ''
		}${print(rules, {sep: ';'})}}-</span>`;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [flags, ...rules] = this.cloneChildNodes() as [ConverterFlagsToken, ...ConverterRuleToken[]];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ConverterToken([], [''], this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(flags);
			token.removeAt(1);
			token.append(...rules);
			return token;
		});
	}

	/** @private */
	override toHtmlInternal(opt?: HtmlOpt): string {
		const flags = this.getEffectiveFlags(),
			nocc = opt?.nocc,
			{childNodes: [, ...rules]} = this;
		if (nocc || flags.has('R') || this.getVariantFlags().size > 0) {
			return (nocc ? '-{' : '') + html(rules, ';', opt) + (nocc ? '}-' : '');
		} else if (flags.has('S')) {
			return rules.find(({variant}) => variant)?.lastChild.toHtmlInternal(opt).trim()
				?? rules[0].lastChild.toHtmlInternal(opt);
		}
		return '';
	}
}

classes['ConverterToken'] = __filename;
