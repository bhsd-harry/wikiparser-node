import * as Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {ConverterToken, ConverterFlagsToken} from '../internal';

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken}`
 */
export class ConverterRuleToken extends Token {
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
	 * @param rule 转换规则
	 * @param hasColon 是否带有":"
	 */
	constructor(rule: string, hasColon = true, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum);
		const i = rule.indexOf(':'),
			j = rule.slice(0, i).indexOf('=>'),
			v = j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i);
		if (hasColon && config.variants.includes(v.trim())) {
			super.insertAt(new AtomToken(v, 'converter-rule-variant', config, accum));
			super.insertAt(new AtomToken(rule.slice(i + 1), 'converter-rule-to', config, accum));
			if (j !== -1) {
				super.insertAt(new AtomToken(rule.slice(0, j), 'converter-rule-from', config, accum), 0);
			}
		} else {
			super.insertAt(new AtomToken(rule, 'converter-rule-to', config, accum));
		}
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `${from.toString(omit)}=>${variant.toString(omit)}:${to.toString(omit)}`;
		}
		return super.toString(omit, ':');
	}

	/** @override */
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
}
