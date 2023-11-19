import {text, print} from '../util/string';
import * as Parser from '../index';
import {Token} from '.';
import {ConverterFlagsToken} from './converterFlags';
import {ConverterRuleToken} from './converterRule';

/**
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken]}`
 */
export class ConverterToken extends Token {
	/** @browser */
	override readonly type = 'converter';
	declare childNodes: [ConverterFlagsToken, ...ConverterRuleToken[]];
	// @ts-expect-error abstract method
	abstract override get children(): [ConverterFlagsToken, ...ConverterRuleToken[]];
	// @ts-expect-error abstract method
	abstract override get firstChild(): ConverterFlagsToken;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): ConverterFlagsToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): ConverterFlagsToken | ConverterRuleToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): ConverterFlagsToken | ConverterRuleToken;

	/** 是否不转换 */
	get noConvert(): boolean {
		return this.hasFlag('R') || this.length === 2 && this.lastChild.length === 1;
	}

	/** 所有转换类型标记 */
	get flags(): Set<string> {
		return this.getAllFlags();
	}

	/**
	 * @browser
	 * @param flags 转换类型标记
	 * @param rules 转换规则
	 */
	constructor(flags: string[], rules: [string, ...string[]], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum);
		this.append(new ConverterFlagsToken(flags, config, accum));
		const [firstRule] = rules,
			hasColon = firstRule.includes(':'),
			firstRuleToken = new ConverterRuleToken(firstRule, hasColon, config, accum);
		if (hasColon && firstRuleToken.length === 1) {
			this.insertAt(new ConverterRuleToken(rules.join(';'), false, config, accum));
		} else {
			this.append(
				firstRuleToken,
				...rules.slice(1).map(rule => new ConverterRuleToken(rule, true, config, accum)),
			);
		}
		this.protectChildren(0);
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		const {childNodes: [flags, ...rules]} = this;
		return omit && this.matchesTypes(omit)
			? ''
			: `-{${flags.toString(omit)}${flags.length > 0 ? '|' : ''}${
				rules.map(rule => rule.toString(omit)).join(';')
			}}-`;
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		const {childNodes: [flags, ...rules]} = this;
		return `-{${flags.text()}|${text(rules, ';')}}-`;
	}

	/** @private */
	protected override getPadding(): number {
		return 2;
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i || this.firstChild.length > 0 ? 1 : 0;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		const {childNodes: [flags, ...rules]} = this;
		return `<span class="wpb-converter">-{${flags.print()}${
			flags.length > 0 ? '|' : ''
		}${print(rules, {sep: ';'})}}-</span>`;
	}

	/** @override */
	override cloneNode(): this {
		const [flags, ...rules] = this.cloneChildNodes() as [ConverterFlagsToken, ...ConverterRuleToken[]];
		return Parser.run(() => {
			const token = new ConverterToken([], [''], this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(flags);
			token.append(...rules);
			return token;
		});
	}

	/** 获取所有转换类型标记 */
	getAllFlags(): Set<string> {
		return this.firstChild.getAllFlags();
	}

	/** 获取有效的转换类型标记 */
	getEffectiveFlags(): Set<string> {
		return this.firstChild.getEffectiveFlags();
	}

	/** 获取未知的转换类型标记 */
	getUnknownFlags(): Set<string> {
		return this.firstChild.getUnknownFlags();
	}

	/**
	 * 是否具有某转换类型标记
	 * @param flag 转换类型标记
	 */
	hasFlag(flag: string): boolean {
		return this.firstChild.hasFlag(flag);
	}

	/**
	 * 是否具有某有效的转换类型标记
	 * @param flag 转换类型标记
	 */
	hasEffectiveFlag(flag: string): boolean {
		return this.firstChild.hasEffectiveFlag(flag);
	}

	/**
	 * 移除转换类型标记
	 * @param flag 转换类型标记
	 */
	removeFlag(flag: string): void {
		this.firstChild.removeFlag(flag);
	}

	/**
	 * 设置转换类型标记
	 * @param flag 转换类型标记
	 */
	setFlag(flag: string): void {
		this.firstChild.setFlag(flag);
	}

	/**
	 * 开关某转换类型标记
	 * @param flag 转换类型标记
	 */
	toggleFlag(flag: string): void {
		this.firstChild.toggleFlag(flag);
	}
}

Parser.classes['ConverterToken'] = __filename;
