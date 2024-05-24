import {
	text,
	print,
} from '../util/string';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {flagsParent} from '../mixin/flagsParent';
import Parser from '../index';
import {Token} from './index';
import {ConverterFlagsToken} from './converterFlags';
import {ConverterRuleToken} from './converterRule';
import type {FlagsParentBase} from '../mixin/flagsParent';

export interface ConverterToken extends FlagsParentBase {}

/**
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken]}`
 */
@flagsParent
export abstract class ConverterToken extends Token {
	override readonly type = 'converter';

	declare readonly childNodes: readonly [ConverterFlagsToken, ...ConverterRuleToken[]];
	abstract override get firstChild(): ConverterFlagsToken;
	abstract override get lastChild(): ConverterFlagsToken | ConverterRuleToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [ConverterFlagsToken, ...ConverterRuleToken[]];
	abstract override get firstElementChild(): ConverterFlagsToken;
	abstract override get lastElementChild(): ConverterFlagsToken | ConverterRuleToken;

	/** 是否不转换 */
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
		if (hasColon && firstRuleToken.length === 1) {
			// @ts-expect-error abstract class
			this.insertAt(new ConverterRuleToken(rules.join(';'), false, config, accum) as ConverterRuleToken);
		} else {
			this.append(
				firstRuleToken,
				// @ts-expect-error abstract class
				...rules.slice(1).map(rule => new ConverterRuleToken(rule, true, config, accum) as ConverterRuleToken),
			);
		}

		/* NOT FOR BROWSER */

		this.protectChildren(0);
	}

	/** @private */
	override toString(): string {
		const {childNodes: [flags, ...rules]} = this;
		return `-{${String(flags)}${flags.length > 0 ? '|' : ''}${rules.map(String).join(';')}}-`;
	}

	/** @override */
	override text(): string {
		const {childNodes: [flags, ...rules]} = this;
		return `-{${flags.text()}|${text(rules, ';')}}-`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 2 as TokenAttributeGetter<T> : super.getAttribute(key);
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

	/** @override */
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
}

classes['ConverterToken'] = __filename;
