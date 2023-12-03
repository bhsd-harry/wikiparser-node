import {
	text,
	print,
} from '../util/string';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {flagsParent} from '../mixin/flagsParent';
import * as Parser from '../index';
import {Token} from './index';
import {ConverterFlagsToken} from './converterFlags';
import {ConverterRuleToken} from './converterRule';

/**
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken]}`
 */
export class ConverterToken extends flagsParent(Token) {
	override readonly type = 'converter';

	declare childNodes: [ConverterFlagsToken, ...ConverterRuleToken[]];
	// @ts-expect-error abstract method
	abstract override get children(): [ConverterFlagsToken, ...ConverterRuleToken[]];
	// @ts-expect-error abstract method
	abstract override get lastChild(): ConverterFlagsToken | ConverterRuleToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): ConverterFlagsToken | ConverterRuleToken;

	/* NOT FOR BROWSER */

	/** 是否不转换 */
	get noConvert(): boolean {
		return this.hasFlag('R') || this.length === 2 && this.lastChild.length === 1;
	}

	set noConvert(value) {
		if (!value) {
			throw new Error('无法稳健地修改为不转换！');
		}
		this.setFlag('R');
	}

	/* NOT FOR BROWSER END */

	/**
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
		this.protectChildren(0);
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		const {childNodes: [flags, ...rules]} = this;
		return omit && this.matchesTypes(omit)
			? ''
			: `-{${flags.toString(omit)}${flags.length > 0 ? '|' : ''}${
				rules.map(rule => rule.toString(omit)).join(';')
			}}-`;
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
	protected override getGaps(i: number): number {
		return i || this.firstChild.length > 0 ? 1 : 0;
	}

	/** @override */
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
			const token = new ConverterToken([], [''], this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(flags);
			token.append(...rules);
			return token;
		});
	}
}

classes['ConverterToken'] = __filename;
