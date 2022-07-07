'use strict';

const {text} = require('../util/string'),
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
		this.protectChildren(0);
	}

	cloneNode() {
		const [flags, ...rules] = this.cloneChildren(),
			token = Parser.run(() => new ConverterToken([], [], this.getAttribute('config')));
		token.firstElementChild.safeReplaceWith(flags);
		token.append(...rules);
		return token;
	}

	toString() {
		const [flags, ...rules] = this.children;
		return `-{${flags.toString()}${flags.childNodes.length ? '|' : ''}${rules.map(String).join(';')}}-`;
	}

	getPadding() {
		return 2;
	}

	/** @param {number} i */
	getGaps(i = 0) {
		i = i < 0 ? i + this.childNodes.length : i;
		return i || this.firstElementChild.childNodes.length ? 1 : 0;
	}

	text() {
		const [flags, ...rules] = this.children;
		return `-{${flags.text()}|${text(rules, ';')}}-`;
	}

	/** @returns {[number, string][]} */
	plain() {
		return this.children.slice(1).flatMap(child => child.plain());
	}

	/** @this {ConverterToken & {firstChild: ConverterFlagsToken}} */
	getAllFlags() {
		return this.firstChild.getAllFlags();
	}

	/** @this {ConverterToken & {firstChild: ConverterFlagsToken}} */
	getEffectiveFlags() {
		return this.firstChild.getEffectiveFlags();
	}

	/** @this {ConverterToken & {firstChild: ConverterFlagsToken}} */
	getUnknownFlags() {
		return this.firstChild.getUnknownFlags();
	}

	/**
	 * @this {ConverterToken & {firstChild: ConverterFlagsToken}}
	 * @param {string} flag
	 */
	hasFlag(flag) {
		return this.firstChild.hasFlag(flag);
	}

	/**
	 * @this {ConverterToken & {firstChild: ConverterFlagsToken}}
	 * @param {string} flag
	 */
	hasEffectiveFlag(flag) {
		return this.firstChild.hasEffectiveFlag(flag);
	}

	/**
	 * @this {ConverterToken & {firstChild: ConverterFlagsToken}}
	 * @param {string} flag
	 */
	removeFlag(flag) {
		this.firstChild.removeFlag(flag);
	}

	/**
	 * @this {ConverterToken & {firstChild: ConverterFlagsToken}}
	 * @param {string} flag
	 */
	setFlag(flag) {
		this.firstChild.setFlag(flag);
	}

	/**
	 * @this {ConverterToken & {firstChild: ConverterFlagsToken}}
	 * @param {string} flag
	 */
	toggleFlag(flag) {
		this.firstChild.toggleFlag(flag);
	}

	/** @this {ConverterToken & {children: [ConverterFlagsToken, ConverterRuleToken]}} */
	get noConvert() {
		return this.childNodes.length < 3 && !this.children[1]?.variant;
	}
}

Parser.classes.ConverterToken = __filename;
module.exports = ConverterToken;
