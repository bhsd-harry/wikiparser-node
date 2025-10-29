import {
	text,
	removeComment,
	print,
} from '../util/string';
import {padded} from '../mixin/padded';
import {noEscape} from '../mixin/noEscape';
import {Token} from './index';
import {ConverterFlagsToken} from './converterFlags';
import {ConverterRuleToken} from './converterRule';
import type {Config} from '../base';

/* NOT FOR BROWSER */

import {html} from '../util/html';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * language conversion
 *
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken[]]}`
 */
@noEscape @padded('-{')
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

	/** all language conversion flags / 所有转换类型标记 */
	get flags(): Set<string> {
		return this.firstChild.flags;
	}

	set flags(value) {
		this.firstChild.flags = value;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param flags 转换类型标记
	 * @param rules 转换规则
	 */
	constructor(flags: readonly string[], rules: readonly [string, ...string[]], config: Config, accum: Token[] = []) {
		super(undefined, config, accum);
		// @ts-expect-error abstract class
		this.insertAt(new ConverterFlagsToken(flags, config, accum) as ConverterFlagsToken);
		const [firstRule] = rules,
			hasColon = firstRule.includes(':'),
			// @ts-expect-error abstract class
			firstRuleToken: ConverterRuleToken = new ConverterRuleToken(firstRule, hasColon, config, accum);
		if (hasColon ? firstRuleToken.length === 1 : rules.length === 2 && !removeComment(rules[1]!).trim()) {
			this.insertAt(
				// @ts-expect-error abstract class
				new ConverterRuleToken(rules.join(';'), false, config, accum) as ConverterRuleToken,
			);
		} else {
			this.safeAppend([
				firstRuleToken,
				...rules.slice(1)
					// @ts-expect-error abstract class
					.map((rule): ConverterRuleToken => new ConverterRuleToken(rule, true, config, accum)),
			]);
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
			const token: this = new ConverterToken([], [''], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(flags);
			token.removeAt(1);
			token.safeAppend(rules);
			return token;
		});
	}

	/** @private */
	@cached()
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

	/**
	 * Get all language conversion flags
	 *
	 * 获取所有转换类型标记
	 */
	getAllFlags(): Set<string> {
		return this.firstChild.getAllFlags();
	}

	/**
	 * Get effective language conversion flags
	 *
	 * 获取有效的转换类型标记
	 */
	getEffectiveFlags(): Set<string> {
		return this.firstChild.getEffectiveFlags();
	}

	/**
	 * Get unknown language conversion flags
	 *
	 * 获取未知的转换类型标记
	 */
	getUnknownFlags(): Set<string> {
		return this.firstChild.getUnknownFlags();
	}

	/**
	 * Get language coversion flags that specify a language variant
	 *
	 * 获取指定语言变体的转换标记
	 */
	getVariantFlags(): Set<string> {
		return this.firstChild.getVariantFlags();
	}

	/**
	 * Check if a language conversion flag is present
	 *
	 * 是否具有某转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	hasFlag(flag: string): boolean {
		return this.firstChild.hasFlag(flag);
	}

	/**
	 * Check if an effective language conversion flag is present
	 *
	 * 是否具有某有效的转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	hasEffectiveFlag(flag: string): boolean {
		return this.firstChild.hasEffectiveFlag(flag);
	}

	/**
	 * Remove a language conversion flag
	 *
	 * 移除某转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	removeFlag(flag: string): void {
		this.firstChild.removeFlag(flag);
	}

	/**
	 * Set a language conversion flag
	 *
	 * 设置转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	setFlag(flag: string): void {
		this.firstChild.setFlag(flag);
	}

	/**
	 * Toggle a language conversion flag
	 *
	 * 开关转换类型标记
	 * @param flag language conversion flag / 转换类型标记
	 */
	toggleFlag(flag: string): void {
		this.firstChild.toggleFlag(flag);
	}
}

classes['ConverterToken'] = __filename;
