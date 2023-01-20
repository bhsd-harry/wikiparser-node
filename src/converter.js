'use strict';

const {text, print} = require('../util/string'),
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
	 * 是否无转换
	 * @this {ConverterToken & {lastChild: ConverterRuleToken}}
	 */
	get noConvert() {
		return this.hasFlag('R') || this.childNodes.length === 2 && !this.lastChild.variant;
	}

	/** flags */
	get flags() {
		return this.getAllFlags();
	}

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
			this.insertAt(new ConverterRuleToken(rules.join(';'), false, config, accum));
		} else {
			this.append(
				firstRuleToken,
				...rules.slice(1).map(rule => new ConverterRuleToken(rule, true, config, accum)),
			);
		}
		this.getAttribute('protectChildren')(0);
	}

	/**
	 * @override
	 * @param {string} selector
	 * @returns {string}
	 */
	toString(selector) {
		const {childNodes: [flags, ...rules]} = this;
		return selector && this.matches(selector)
			? ''
			: `-{${flags.toString(selector)}${flags.childNodes.length > 0 ? '|' : ''}${rules.map(String).join(';')}}-`;
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		const {childNodes: [flags, ...rules]} = this;
		return `-{${flags.text()}|${text(rules, ';')}}-`;
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
		return i || this.firstChild.childNodes.length > 0 ? 1 : 0;
	}

	/** @override */
	print() {
		const {childNodes: [flags, ...rules]} = this;
		return `<span class="wpb-converter">-{${flags.print()}${
			flags.childNodes.length > 0 ? '|' : ''
		}${print(rules, {sep: ';'})}}-</span>`;
	}

	/** @override */
	cloneNode() {
		const [flags, ...rules] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new ConverterToken([], [], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(flags);
			token.append(...rules);
			return token;
		});
	}

	/**
	 * 获取所有转换类型标记
	 * @this {{firstChild: ConverterFlagsToken}}
	 */
	getAllFlags() {
		return this.firstChild.getAllFlags();
	}

	/**
	 * 获取有效的转换类型标记
	 * @this {{firstChild: ConverterFlagsToken}}
	 */
	getEffectiveFlags() {
		return this.firstChild.getEffectiveFlags();
	}

	/**
	 * 获取未知的转换类型标记
	 * @this {{firstChild: ConverterFlagsToken}}
	 */
	getUnknownFlags() {
		return this.firstChild.getUnknownFlags();
	}

	/**
	 * 是否具有某转换类型标记
	 * @this {{firstChild: ConverterFlagsToken}}
	 * @param {string} flag 转换类型标记
	 */
	hasFlag(flag) {
		return this.firstChild.hasFlag(flag);
	}

	/**
	 * 是否具有某有效的转换类型标记
	 * @this {{firstChild: ConverterFlagsToken}}
	 * @param {string} flag 转换类型标记
	 */
	hasEffectiveFlag(flag) {
		return this.firstChild.hasEffectiveFlag(flag);
	}

	/**
	 * 移除转换类型标记
	 * @this {{firstChild: ConverterFlagsToken}}
	 * @param {string} flag 转换类型标记
	 */
	removeFlag(flag) {
		this.firstChild.removeFlag(flag);
	}

	/**
	 * 设置转换类型标记
	 * @this {{firstChild: ConverterFlagsToken}}
	 * @param {string} flag 转换类型标记
	 */
	setFlag(flag) {
		this.firstChild.setFlag(flag);
	}

	/**
	 * 开关某转换类型标记
	 * @this {{firstChild: ConverterFlagsToken}}
	 * @param {string} flag 转换类型标记
	 */
	toggleFlag(flag) {
		this.firstChild.toggleFlag(flag);
	}
}

Parser.classes.ConverterToken = __filename;
module.exports = ConverterToken;
