'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken)}`
 */
class ConverterRuleToken extends Token {
	type = 'converter-rule';

	/**
	 * @param {string} rule
	 * @param {accum} accum
	 */
	constructor(rule, hasColon = true, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		if (!hasColon) {
			super.insertAt(new AtomToken(rule, 'converter-rule-noconvert', config, accum));
		} else {
			const i = rule.indexOf(':'),
				j = rule.slice(0, i).indexOf('=>'),
				v = (j === -1 ? rule.slice(0, i) : rule.slice(j + 2, i)).trim(),
				{variants} = config;
			if (!variants.includes(v)) {
				super.insertAt(new AtomToken(rule, 'converter-rule-noconvert', config, accum));
			} else {
				super.insertAt(new AtomToken(v, 'converter-rule-variant', config, accum));
				super.insertAt(new AtomToken(rule.slice(i + 1), 'converter-rule-to', config, accum));
				if (j !== -1) {
					super.insertAt(new AtomToken(rule.slice(0, j), 'converter-rule-from', config, accum), 0);
				}
			}
		}
	}

	/** @returns {string} */
	toString() {
		if (this.childNodes.length === 3) {
			const [from, variant, to] = this.children;
			return `${from.toString()}=>${variant.toString()}:${to.toString()}`;
		}
		return super.toString(':');
	}

	print() {
		if (this.childNodes.length === 3) {
			const [from, variant, to] = this.children;
			return `<span class="converter-rule">${from.print()}=>${variant.print()}:${to.print()}</span>`;
		}
		return super.print({sep: ':'});
	}

	/** @returns {string} */
	text() {
		if (this.childNodes.length === 3) {
			const [from, variant, to] = this.children;
			return `${from.text()}=>${variant.text()}:${to.text()}`;
		}
		return super.text(':');
	}
}

module.exports = ConverterRuleToken;
