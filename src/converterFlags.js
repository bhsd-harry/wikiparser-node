'use strict';
const lint_1 = require('../util/lint');
const {generateForChild} = lint_1;
const Parser = require('../index');
const Token = require('.');
const AtomToken = require('./atom');
const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
class ConverterFlagsToken extends Token {
	/** @browser */
	type = 'converter-flags';
	/** @browser */
	#flags;

	/**
	 * @browser
	 * @param flags 转换类型标记
	 */
	constructor(flags, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			AtomToken: ':',
		});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** @private */
	afterBuild() {
		this.#flags = this.childNodes.map(child => child.text().trim());
		const /** @implements */ converterFlagsListener = ({prevTarget}) => {
			if (prevTarget) {
				this.#flags[this.childNodes.indexOf(prevTarget)] = prevTarget.text().trim();
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterFlagsListener);
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		return super.toString(selector, ';');
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		return super.text(';');
	}

	/** @private */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print({sep: ';'});
	}

	/**
	 * 获取未知的转换类型标记
	 * @browser
	 */
	getUnknownFlags() {
		return new Set(this.#flags.filter(flag => /\{{3}[^{}]+\}{3}/u.test(flag)));
	}

	/**
	 * 获取指定语言变体的转换标记
	 * @browser
	 */
	getVariantFlags() {
		const variants = new Set(this.getAttribute('config').variants);
		return new Set(this.#flags.filter(flag => variants.has(flag)));
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags(),
			validFlags = new Set(this.#flags.filter(flag => definedFlags.has(flag))),
			{length: emptyFlagCount} = this.#flags.filter(flag => !flag),
			knownFlagCount = this.#flags.length - unknownFlags.size - emptyFlagCount,
			errors = super.lint(start);
		if (variantFlags.size === knownFlagCount || validFlags.size === knownFlagCount) {
			return errors;
		}
		const rect = {start, ...this.getRootNode().posFromIndex(start)},
			{childNodes, length} = this;
		for (let i = 0; i < length; i++) {
			const child = childNodes[i],
				flag = child.text().trim();
			if (flag && !variantFlags.has(flag) && !unknownFlags.has(flag)
				&& (variantFlags.size > 0 || !validFlags.has(flag))) {
				const error = generateForChild(child, rect, 'invalid conversion flag');
				errors.push({...error, excerpt: childNodes.slice(0, i + 1).map(String).join(';').slice(-50)});
			}
		}
		return errors;
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

	/** @private */
	getAttribute(key) {
		return key === 'flags' ? this.#flags : super.getAttribute(key);
	}

	/** @private */
	hasAttribute(key) {
		return key === 'flags' || super.hasAttribute(key);
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	removeAt(i) {
		const token = super.removeAt(i);
		this.#flags?.splice(i, 1);
		return token;
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	insertAt(token, i = this.length) {
		super.insertAt(token, i);
		this.#flags?.splice(i, 0, token.text().trim());
		return token;
	}

	/** 获取所有转换类型标记 */
	getAllFlags() {
		return new Set(this.#flags);
	}

	/**
	 * 获取转换类型标记节点
	 * @param flag 转换类型标记
	 */
	getFlagToken(flag) {
		return this.#flags.includes(flag) ? this.childNodes.filter(child => child.text().trim() === flag) : [];
	}

	/** 获取有效的转换类型标记 */
	getEffectiveFlags() {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags();
		if (variantFlags.size > 0) {
			return new Set([...variantFlags, ...unknownFlags]);
		}
		const flags = new Set([...this.#flags.filter(flag => definedFlags.has(flag)), ...unknownFlags]);
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
	 * @param flag 转换类型标记
	 */
	hasFlag(flag) {
		return typeof flag === 'string' ? this.#flags.includes(flag) : this.typeError('hasFlag', 'String');
	}

	/**
	 * 是否具有某有效的转换类型标记
	 * @param flag 转换类型标记
	 */
	hasEffectiveFlag(flag) {
		return typeof flag === 'string' ? this.getEffectiveFlags().has(flag) : this.typeError('hasEffectiveFlag', 'String');
	}

	/**
	 * 移除某转换类型标记
	 * @param flag 转换类型标记
	 */
	removeFlag(flag) {
		for (const token of this.getFlagToken(flag)) {
			token.remove();
		}
	}

	/**
	 * 添加转换类型标记
	 * @param flag 转换类型标记
	 */
	#newFlag(flag) {
		const token = Parser.run(() => new AtomToken(flag, 'converter-flag', this.getAttribute('config')));
		this.insertAt(token);
	}

	/**
	 * 设置转换类型标记
	 * @param flag 转换类型标记
	 */
	setFlag(flag) {
		if (!this.#flags.includes(flag)) {
			this.#newFlag(flag);
		}
	}

	/**
	 * 开关转换类型标记
	 * @param flag 转换类型标记
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
