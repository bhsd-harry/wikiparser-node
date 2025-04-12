import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {ConverterToken, ConverterFlagsToken} from '../internal';

/**
 * language conversion rule
 *
 * 转换规则
 * @classdesc `{childNodes: AtomToken[]}`
 */
export abstract class ConverterRuleToken extends Token {
	declare readonly childNodes: readonly [AtomToken]
		| readonly [AtomToken, AtomToken]
		| readonly [AtomToken, AtomToken, AtomToken];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): AtomToken;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get previousSibling(): ConverterFlagsToken | this | undefined;
	abstract override get nextSibling(): this | undefined;

	override get type(): 'converter-rule' {
		return 'converter-rule';
	}

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
				super.insertAt(
					new AtomToken(rule.slice(0, j), 'converter-rule-from', config, accum),
					0,
				);
			}
		} else {
			super.insertAt(new AtomToken(rule, 'converter-rule-to', config, accum));
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		const {childNodes, firstChild, lastChild} = this;
		return childNodes.length === 3
			? `${firstChild.toString(skip)}=>${childNodes[1].toString(skip)}:${lastChild.toString(skip)}`
			: super.toString(skip, ':');
	}

	/** @private */
	override text(): string {
		const {childNodes, firstChild, lastChild} = this;
		return childNodes.length === 3
			? `${firstChild.text()}=>${childNodes[1].text()}:${lastChild.text()}`
			: super.text(':');
	}

	/** @private */
	override getGaps(i: number): number {
		return i === 0 && this.length === 3 ? 2 : 1;
	}
}
