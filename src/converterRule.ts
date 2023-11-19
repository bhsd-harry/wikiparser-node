import Parser from '../index';
import {Token} from '.';
import {AtomToken} from './atom';
import type {ConverterToken, ConverterFlagsToken} from '../internal';

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken}`
 */
export class ConverterRuleToken extends Token {
	/** @browser */
	override readonly type = 'converter-rule';
	declare childNodes: [AtomToken] | [AtomToken, AtomToken] | [AtomToken, AtomToken, AtomToken];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ConverterToken | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): ConverterFlagsToken | this;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): this | undefined;

	/**
	 * @browser
	 * @param rule 转换规则
	 * @param hasColon 是否带有":"
	 */
	constructor(rule: string, hasColon = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum);
		if (hasColon) {
			const i = rule.indexOf(':'),
				j = rule.slice(0, i).indexOf('=>'),
				v = j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i);
			if (config.variants.includes(v.trim())) {
				super.insertAt(new AtomToken(v, 'converter-rule-variant', config, accum));
				super.insertAt(new AtomToken(rule.slice(i + 1), 'converter-rule-to', config, accum));
				if (j !== -1) {
					super.insertAt(new AtomToken(rule.slice(0, j), 'converter-rule-from', config, accum), 0);
				}
			} else {
				super.insertAt(new AtomToken(rule, 'converter-rule-noconvert', config, accum));
			}
		} else {
			super.insertAt(new AtomToken(rule, 'converter-rule-noconvert', config, accum));
		}
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `${from.toString(omit)}=>${variant.toString(omit)}:${to.toString(omit)}`;
		}
		return super.toString(omit, ':');
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `${from.text()}=>${variant.text()}:${to.text()}`;
		}
		return super.text(':');
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i === 0 && this.length === 3 ? 2 : 1;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `<span class="wpb-converter-rule">${from.print()}=>${variant.print()}:${to.print()}</span>`;
		}
		return super.print({sep: ':'});
	}
}
