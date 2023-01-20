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
		super(undefined, config, true, accum, {AtomToken: ':'});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/**
	 * @override
	 * @complexity `n`
	 */
	afterBuild() {
		this.#flags = this.childNodes.map(child => child.text().trim());
		const /** @type {AstListener} */ converterFlagsListener = ({prevTarget}) => {
			if (prevTarget) {
				this.#flags[this.childNodes.indexOf(prevTarget)] = prevTarget.text().trim();
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterFlagsListener);
		return this;
	}

	/**
	 * @override
	 * @param {string} selector
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
		return this.#flags.filter(flag => /\{\{[^{}]+\}\}/u.test(flag));
	}

	/** 获取指定语言变体的转换标记 */
	getVariantFlags() {
		const {variants} = this.getAttribute('config');
		return this.#flags.filter(flag => variants.includes(flag));
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new ConverterFlagsToken([], this.getAttribute('config'));
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'flags') {
			return Parser.debugging ? this.#flags : [...this.#flags];
		}
		return super.getAttribute(key);
	}

	/**
	 * @override
	 * @param {PropertyKey} key 属性键
	 */
	hasAttribute(key) {
		return key === 'flags' || super.hasAttribute(key);
	}

	/**
	 * @override
	 * @param {number} i 移除位置
	 * @complexity `n`
	 */
	removeAt(i) {
		const /** @type {AtomToken} */ token = super.removeAt(i);
		this.#flags?.splice(i, 1);
		return token;
	}

	/**
	 * @override
	 * @param {AtomToken} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		super.insertAt(token, i);
		this.#flags?.splice(i, 0, token.text());
		return token;
	}

	/** 获取所有转换类型标记 */
	getAllFlags() {
		return new Set(this.#flags);
	}

	/**
	 * 获取转换类型标记节点
	 * @param {string} flag 转换类型标记
	 * @returns {AtomToken[]}
	 * @complexity `n`
	 */
	getFlagToken(flag) {
		return this.#flags.includes(flag) ? this.childNodes.filter(child => child.text().trim() === flag) : [];
	}

	/**
	 * 获取有效转换类型标记
	 * @complexity `n`
	 */
	getEffectiveFlags() {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags();
		if (variantFlags.length > 0) {
			return new Set([...variantFlags, ...unknownFlags]);
		}
		const validFlags = ['A', 'T', 'R', 'D', '-', 'H', 'N'],
			flags = new Set([...this.#flags.filter(flag => validFlags.includes(flag)), ...unknownFlags]);
		if (flags.size === 0) {
			return new Set('S');
		} else if (flags.has('R')) {
			return new Set('R');
		} else if (flags.has('N')) {
			return new Set('N');
		} else if (flags.has('-')) {
			return new Set('-');
		} else if (flags.has('H')) {
			const hasT = flags.has('T'),
				hasD = flags.has('D');
			return hasT && hasD
				? new Set(['+', 'H', 'T', 'D'])
				: new Set(['+', 'H', ...hasT ? ['T'] : [], ...hasD ? ['D'] : [], ...unknownFlags]);
		}
		if (flags.size === 1 && flags.has('T')) {
			flags.add('H');
		}
		if (flags.has('A')) {
			flags.add('+');
			flags.add('S');
		}
		if (flags.has('D')) {
			flags.delete('S');
		}
		return flags;
	}

	/**
	 * 是否具有某转换类型标记
	 * @param {string} flag 转换类型标记
	 */
	hasFlag(flag) {
		return typeof flag === 'string' ? this.#flags.includes(flag) : this.typeError('hasFlag', 'String');
	}

	/**
	 * 是否具有某有效转换类型标记
	 * @param {string} flag 转换类型标记
	 * @complexity `n`
	 */
	hasEffectiveFlag(flag) {
		return typeof flag === 'string' ? this.getEffectiveFlags().has(flag) : this.typeError('hasFlag', 'String');
	}

	/**
	 * 移除某转换类型标记
	 * @param {string} flag 转换类型标记
	 * @complexity `n²`
	 */
	removeFlag(flag) {
		for (const token of this.getFlagToken(flag)) {
			token.remove();
		}
	}

	/**
	 * 添加转换类型标记
	 * @param {string} flag 转换类型标记
	 * @complexity `n`
	 */
	#newFlag(flag) {
		const token = Parser.run(() => new AtomToken(flag, 'converter-flag', this.getAttribute('config')));
		this.insertAt(token);
	}

	/**
	 * 设置转换类型标记
	 * @param {string} flag 转换类型标记
	 * @complexity `n`
	 */
	setFlag(flag) {
		if (!this.#flags.includes(flag)) {
			this.#newFlag(flag);
		} else if (!this.getEffectiveFlags().has(flag)) {
			Parser.error('此 flag 不会生效', flag);
		}
	}

	/**
	 * 开关转换类型标记
	 * @param {string} flag 转换类型标记
	 * @complexity `n²`
	 */
	toggleFlag(flag) {
		if (this.#flags.includes(flag)) {
			this.removeFlag(flag);
		} else {
			this.#newFlag(flag);
		}
	}
}

Parser.classes.ConverterFlagsToken = __filename;
module.exports = ConverterFlagsToken;
