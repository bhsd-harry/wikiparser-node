'use strict';

const {generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

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

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags(),
			validFlags = new Set(this.#flags.filter(flag => definedFlags.has(flag))),
			{length: emptyFlagCount} = this.#flags.filter(flag => !flag),
			knownFlagCount = this.#flags.length - unknownFlags.size - emptyFlagCount,
			errors = super.lint(start);
		if (variantFlags.size === knownFlagCount || validFlags.size === knownFlagCount) {
			return errors;
		}
		const rect = this.getRootNode().posFromIndex(start),
			{childNodes} = this;
		for (let i = 0; i < childNodes.length; i++) {
			const child = childNodes[i],
				flag = child.text().trim();
			if (flag && !variantFlags.has(flag) && !unknownFlags.has(flag)
				&& (variantFlags.size > 0 || !validFlags.has(flag))
			) {
				const error = generateForChild(child, rect, '无效的转换标记');
				errors.push({...error, excerpt: childNodes.slice(0, i + 1).map(String).join(';').slice(-50)});
			}
		}
		return errors;
	}

	/**
	 * 获取未知转换类型标记
	 * @complexity `n`
	 */
	getUnknownFlags() {
		return new Set(this.#flags.filter(flag => /\{\{[^{}]+\}\}/u.test(flag)));
	}

	/** 获取指定语言变体的转换标记 */
	getVariantFlags() {
		const variants = new Set(this.getAttribute('config').variants);
		return new Set(this.#flags.filter(flag => variants.has(flag)));
	}
}

module.exports = ConverterFlagsToken;
