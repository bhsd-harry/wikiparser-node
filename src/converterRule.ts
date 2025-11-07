import {
	MAX_STAGE,
} from '../util/constants';
import {noEscape} from '../mixin/noEscape';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {
	Config,
} from '../base';
import type {ConverterToken, ConverterFlagsToken} from '../internal';

/**
 * 生成转换原文或目标的节点
 * @param text 文本
 * @param type 节点类型
 * @param config
 * @param accum
 */
const getRuleFromTo = (text: string | undefined, type: 'from' | 'to', config: Config, accum?: Token[]): Token => {
	const token = new Token(text, config, accum);
	token.type = `converter-rule-${type}`;
	token.setAttribute('stage', MAX_STAGE);
	return token;
};

/**
 * language conversion rule
 *
 * 转换规则
 * @classdesc `{childNodes: [Token?, AtomToken?, Token]}`
 */
@noEscape
export abstract class ConverterRuleToken extends Token {
	declare readonly childNodes: readonly [Token] | readonly [AtomToken, Token] | readonly [Token, AtomToken, Token];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): Token;
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
		super(undefined, config, accum, {
		});
		const i = rule.indexOf(':'),
			j = rule.slice(0, i).indexOf('=>'),
			v = j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i);
		if (hasColon && config.variants.includes(v.trim().toLowerCase())) {
			super.insertAt(new AtomToken(v, 'converter-rule-variant', config, accum));
			super.insertAt(getRuleFromTo(rule.slice(i + 1), 'to', config, accum));
			if (j !== -1) {
				super.insertAt(getRuleFromTo(rule.slice(0, j), 'from', config, accum), 0);
			}
		} else {
			super.insertAt(getRuleFromTo(rule, 'to', config, accum));
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
