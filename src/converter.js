'use strict';

const {print} = require('../util/string'),
	Parser = require('..'),
	Token = require('.'),
	ConverterFlagsToken = require('./converterFlags'),
	ConverterRuleToken = require('./converterRule');

/**
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken]}`
 */
class ConverterToken extends Token {
	type = 'converter';

	/**
	 * @param {string[]} flags 转换类型标记
	 * @param {string[]} rules 转换规则
	 * @param {accum} accum
	 */
	constructor(flags, rules, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.append(new ConverterFlagsToken(flags, config, accum));
		const [firstRule] = rules,
			hasColon = firstRule.includes(':'),
			firstRuleToken = new ConverterRuleToken(firstRule, hasColon, config, accum);
		if (hasColon && firstRuleToken.childNodes.length === 1) {
			this.appendChild(new ConverterRuleToken(rules.join(';'), false, config, accum));
		} else {
			this.append(
				firstRuleToken,
				...rules.slice(1).map(rule => new ConverterRuleToken(rule, true, config, accum)),
			);
		}
	}

	/** @override */
	toString() {
		const {children: [flags, ...rules]} = this;
		return `-{${flags.toString()}${flags.childNodes.length > 0 ? '|' : ''}${rules.map(String).join(';')}}-`;
	}

	/** @override */
	getPadding() {
		return 2;
	}

	/**
	 * @override
	 * @param {number} i 子节点位置
	 */
	getGaps(i = 0) {
		i = i < 0 ? i + this.childNodes.length : i;
		return i || this.firstElementChild.childNodes.length > 0 ? 1 : 0;
	}

	/** @override */
	print() {
		const {children: [flags, ...rules]} = this;
		return `<span class="wpb-converter">-{${flags.print()}${
			flags.childNodes.length > 0 ? '|' : ''
		}${print(rules, {sep: ';'})}}-</span>`;
	}
}

module.exports = ConverterToken;
