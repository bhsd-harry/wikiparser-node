'use strict';

const Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken)}`
 */
class ConverterRuleToken extends Token {
	type = 'converter-rule';

	/**
	 * @param {string} rule 转换规则
	 * @param {boolean} hasColon 是否带有":"
	 * @param {accum} accum
	 */
	constructor(rule, hasColon = true, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		if (hasColon) {
			const i = rule.indexOf(':'),
				j = rule.slice(0, i).indexOf('=>'),
				v = j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i),
				{variants} = config;
			if (variants.includes(v.trim())) {
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
	 * @returns {string}
	 */
	toString(selector) {
		if (this.childNodes.length === 3) {
			const {childNodes: [from, variant, to]} = this;
			return `${from.toString(selector)}=>${variant.toString(selector)}:${to.toString(selector)}`;
		}
		return super.toString(selector, ':');
	}

	/**
	 * @override
	 * @param {number} i 子节点序号
	 */
	getGaps(i = 0) {
		const {length} = this;
		i = i < 0 ? i + length : i;
		return i === 0 && length === 3 ? 2 : 1;
	}

	/** @override */
	print() {
		if (this.childNodes.length === 3) {
			const {childNodes: [from, variant, to]} = this;
			return `<span class="wpb-converter-rule">${from.print()}=>${variant.print()}:${to.print()}</span>`;
		}
		return super.print({sep: ':'});
	}
}

module.exports = ConverterRuleToken;
