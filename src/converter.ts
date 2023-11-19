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
	abstract override get firstChild(): ConverterFlagsToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): ConverterFlagsToken | ConverterRuleToken;

	/**
	 * @browser
	 * @param flags 转换类型标记
	 * @param rules 转换规则
	 */
	constructor(flags: string[], rules: [string, ...string[]], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum);
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
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		const {childNodes: [flags, ...rules]} = this;
		return `-{${flags.toString()}${flags.length > 0 ? '|' : ''}${rules.map(rule => rule.toString()).join(';')}}-`;
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
}
