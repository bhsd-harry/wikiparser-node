import {
	text,
	removeComment,
} from '../util/string';
import {padded} from '../mixin/padded';
import {Token} from './index';
import {ConverterFlagsToken} from './converterFlags';
import {ConverterRuleToken} from './converterRule';
import type {Config} from '../base';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';

/* NOT FOR BROWSER END */

/**
 * language conversion
 *
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ConverterRuleToken, ...ConverterRuleToken[]]}`
 */
@padded('-{')
export abstract class ConverterToken extends Token {
	declare readonly childNodes: readonly [ConverterFlagsToken, ConverterRuleToken, ...ConverterRuleToken[]];
	abstract override get firstChild(): ConverterFlagsToken;
	abstract override get lastChild(): ConverterFlagsToken | ConverterRuleToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [ConverterFlagsToken, ConverterRuleToken, ...ConverterRuleToken[]];

	/* NOT FOR BROWSER END */

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
	override toHtmlOrPlain(func: HtmlOrPlainFunc, method: Method, opt?: HtmlOpt): string {
		const flags = this.getEffectiveFlags(),
			nocc = method === 'toHtmlInternal' && opt?.nocc,
			[, ...rules] = this.childNodes;
		if (nocc || flags.has('R') || this.getVariantFlags().size > 0) {
			return (nocc ? '-{' : '') + func(rules, ';', opt) + (nocc ? '}-' : '');
		} else if (flags.has('S')) {
			return rules.find(({variant}) => variant)?.lastChild[method](opt).trim()
				?? rules[0].lastChild[method](opt);
		}
		return '';
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
}
