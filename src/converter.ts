import {
	text,
	removeComment,
} from '../util/string';
import {Token} from './index';
import {ConverterFlagsToken} from './converterFlags';
import {ConverterRuleToken} from './converterRule';
import type {Config} from '../base';

/**
 * language conversion
 *
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken[]]}`
 */
export abstract class ConverterToken extends Token {
	declare readonly childNodes: readonly [ConverterFlagsToken, ConverterRuleToken, ...ConverterRuleToken[]];
	abstract override get firstChild(): ConverterFlagsToken;
	abstract override get lastChild(): ConverterFlagsToken | ConverterRuleToken;

	override get type(): 'converter' {
		return 'converter';
	}

	/**
	 * @param flags 转换类型标记
	 * @param rules 转换规则
	 */
	constructor(flags: readonly string[], rules: readonly [string, ...string[]], config: Config, accum: Token[] = []) {
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
}
