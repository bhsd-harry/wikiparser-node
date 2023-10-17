'use strict';
const string_1 = require('../util/string');
const {text, print} = string_1;
const Parser = require('../index');
const Token = require('.');
const ConverterFlagsToken = require('./converterFlags');
const ConverterRuleToken = require('./converterRule');

/**
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken]}`
 */
class ConverterToken extends Token {
	/** @browser */
	type = 'converter';

	/** 是否不转换 */
	get noConvert() {
		return this.hasFlag('R') || this.length === 2 && this.lastChild.length === 1;
	}

	/** 所有转换类型标记 */
	get flags() {
		return this.getAllFlags();
	}

	/**
	 * @browser
	 * @param flags 转换类型标记
	 * @param rules 转换规则
	 */
	constructor(flags, rules, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.append(new ConverterFlagsToken(flags, config, accum));
		const [firstRule] = rules,
			hasColon = firstRule.includes(':'),
			firstRuleToken = new ConverterRuleToken(firstRule, hasColon, config, accum);
		if (hasColon && firstRuleToken.length === 1) {
			this.insertAt(new ConverterRuleToken(rules.join(';'), false, config, accum));
		} else {
			this.append(firstRuleToken,
				...rules.slice(1).map(rule => new ConverterRuleToken(rule, true, config, accum)));
		}
		this.protectChildren(0);
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		const {childNodes: [flags, ...rules]} = this;
		return selector && this.matches(selector)
			? ''
			: `-{${flags.toString(selector)}${flags.length > 0 ? '|' : ''}${rules.map(rule => rule.toString(selector)).join(';')}}-`;
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		const {childNodes: [flags, ...rules]} = this;
		return `-{${flags.text()}|${text(rules, ';')}}-`;
	}

	/** @private */
	getPadding() {
		return 2;
	}

	/** @private */
	getGaps(i = 0) {
		const j = i < 0 ? i + this.length : i;
		return j || this.firstChild.length > 0 ? 1 : 0;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		const {childNodes: [flags, ...rules]} = this;
		return `<span class="wpb-converter">-{${flags.print()}${flags.length > 0 ? '|' : ''}${print(rules, {sep: ';'})}}-</span>`;
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

	/** 获取所有转换类型标记 */
	getAllFlags() {
		return this.firstChild.getAllFlags();
	}

	/** 获取有效的转换类型标记 */
	getEffectiveFlags() {
		return this.firstChild.getEffectiveFlags();
	}

	/** 获取未知的转换类型标记 */
	getUnknownFlags() {
		return this.firstChild.getUnknownFlags();
	}

	/**
	 * 是否具有某转换类型标记
	 * @param flag 转换类型标记
	 */
	hasFlag(flag) {
		return this.firstChild.hasFlag(flag);
	}

	/**
	 * 是否具有某有效的转换类型标记
	 * @param flag 转换类型标记
	 */
	hasEffectiveFlag(flag) {
		return this.firstChild.hasEffectiveFlag(flag);
	}

	/**
	 * 移除转换类型标记
	 * @param flag 转换类型标记
	 */
	removeFlag(flag) {
		this.firstChild.removeFlag(flag);
	}

	/**
	 * 设置转换类型标记
	 * @param flag 转换类型标记
	 */
	setFlag(flag) {
		this.firstChild.setFlag(flag);
	}

	/**
	 * 开关某转换类型标记
	 * @param flag 转换类型标记
	 */
	toggleFlag(flag) {
		this.firstChild.toggleFlag(flag);
	}
}
Parser.classes.ConverterToken = __filename;
module.exports = ConverterToken;
