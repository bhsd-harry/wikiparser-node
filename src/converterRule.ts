import Parser from '../index';
import {Token} from '.';
import {AtomToken} from './atom';
import type {ConverterToken, ConverterFlagsToken} from '../internal';

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken}`
 */
export abstract class ConverterRuleToken extends Token {
	/** @browser */
	override readonly type = 'converter-rule';
	declare childNodes: [AtomToken] | [AtomToken, AtomToken] | [AtomToken, AtomToken, AtomToken];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): AtomToken;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get previousSibling(): ConverterFlagsToken | this;
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
	override toString(selector?: string): string {
		const {childNodes} = this;
		if (childNodes.length === 3) {
			const [from, variant, to] = childNodes;
			return `${from.toString(selector)}=>${variant.toString(selector)}:${to.toString(selector)}`;
		}
		return super.toString(selector, ':');
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
		const {length} = this;
		return i === 0 && length === 3 ? 2 : 1;
	}
}
