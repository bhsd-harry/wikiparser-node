'use strict';

const {text, print} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
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
	 * @param {string[]} flags
	 * @param {string[]} rules
	 * @param {accum} accum
	 */
	constructor(flags, rules, config = Parser.getConfig(), accum = []) {
		super(undefined, config, false, accum);
		this.append(new ConverterFlagsToken(flags, config, accum));
		if (rules.length) {
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
	}

	toString() {
		const [flags, ...rules] = this.children;
		return `-{${flags.toString()}${flags.childNodes.length ? '|' : ''}${rules.map(String).join(';')}}-`;
	}

	print() {
		const [flags, ...rules] = this.children;
		return `<span class="converter">-{${flags.print()}${
			flags.childNodes.length ? '|' : ''
		}${print(rules, {sep: ';'})}}-</span>`;
	}

	text() {
		const [flags, ...rules] = this.children;
		return `-{${flags.text()}|${text(rules, ';')}}-`;
	}
}

module.exports = ConverterToken;
