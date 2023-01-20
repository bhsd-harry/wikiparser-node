'use strict';

const {generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
class ConverterFlagsToken extends Token {
	type = 'converter-flags';
	/** @type {string[]} */ #flags;

	/**
	 * @param {string[]} flags 转换类型标记
	 * @param {accum} accum
	 */
	constructor(flags, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
		});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/**
	 * @override
	 * @complexity `n`
	 */
	afterBuild() {
		this.#flags = this.childNodes.map(child => child.text().trim());
		return this;
	}

	/**
	 * @override
	 */
	toString(selector) {
		return super.toString(selector, ';');
	}

	/** @override */
	text() {
		return super.text(';');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		return super.print({sep: ';'});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags(),
			emptyFlags = this.#flags.filter(flag => !flag),
			validFlags = this.#flags.filter(flag => ['A', 'T', 'R', 'D', '-', 'H', 'N'].includes(flag)),
			knownFlagCount = this.#flags.length - unknownFlags.length - emptyFlags,
			errors = super.lint(start);
		if (variantFlags.length === knownFlagCount || validFlags.length === knownFlagCount) {
			return errors;
		}
		const rect = this.getRootNode().posFromIndex(start),
			{childNodes} = this;
		for (let i = 0; i < childNodes.length; i++) {
			const child = childNodes[i],
				flag = child.text().trim();
			if (flag && !variantFlags.includes(flag) && !unknownFlags.includes(flag)
				&& (variantFlags.length > 0 || !validFlags.includes(flag))
			) {
				const error = generateForChild(child, rect, '无效的转换标记');
				errors.push(error);
			}
		}
		return errors;
	}

	/**
	 * 获取未知转换类型标记
	 * @complexity `n`
	 */
	getUnknownFlags() {
		return this.#flags.filter(flag => /\{\{[^{}]+\}\}/u.test(flag));
	}

	/** 获取指定语言变体的转换标记 */
	getVariantFlags() {
		const {variants} = this.getAttribute('config');
		return this.#flags.filter(flag => variants.includes(flag));
	}
}

module.exports = ConverterFlagsToken;
