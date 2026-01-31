import {
	text,
	removeComment,
} from '../util/string';
import {padded} from '../mixin/padded';
import {noEscape} from '../mixin/noEscape';
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
@noEscape @padded('-{')
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
	}

	/** @private */
	override toString(skip?: boolean): string {
		const [flags, ...rules] = this.childNodes;
		return `-{${flags.toString(skip)}${flags.length > 0 ? '|' : ''}${
			rules.map(rule => rule.toString(skip)).join(';')
		}}-`;
	}

	/** @private */
	override text(): string {
		const [flags, ...rules] = this.childNodes;
		return `-{${flags.text()}|${text(rules, ';')}}-`;
	}

	/** @private */
	override getGaps(i: number): number {
		return i || this.firstChild.length > 0 ? 1 : 0;
	}
}
