'use strict';

const /** @type {Parser} */ Parser = require('..'),
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
	 * @param {string[]} flags
	 * @param {accum} accum
	 */
	constructor(flags, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AtomToken: ':'});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	cloneNode() {
		const cloned = this.cloneChildren(),
			token = Parser.run(() => new ConverterFlagsToken([], this.getAttribute('config')));
		token.append(...cloned);
		token.afterBuild();
		return token;
	}

	/** @complexity `n` */
	afterBuild() {
		this.#flags = this.children.map(child => child.text().trim());
		const that = this,
			/** @type {AstListener} */ converterFlagsListener = ({prevTarget}) => {
				if (prevTarget) {
					that.#flags[that.childNodes.indexOf(prevTarget)] = prevTarget.text().trim();
				}
			};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterFlagsListener);
		return this;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'flags') {
			return Parser.debugging ? this.#flags : [...this.#flags];
		}
		return super.getAttribute(key);
	}

	/**
	 * @param {number} i
	 * @complexity `n`
	 */
	removeAt(i) {
		const /** @type {AtomToken} */ token = super.removeAt(i);
		this.#flags?.splice(i, 1);
		return token;
	}

	/**
	 * @param {AtomToken} token
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		super.insertAt(token, i);
		this.#flags?.splice(i, 0, token.text());
		return token;
	}

	toString() {
		return super.toString(';');
	}

	getGaps() {
		return 1;
	}

	text() {
		return super.text(';');
	}

	/**
	 * @param {string} flag
	 * @returns {AtomToken[]}
	 * @complexity `n`
	 */
	getFlagToken(flag) {
		return this.#flags.includes(flag) ? this.children.filter(child => child.text().trim() === flag) : [];
	}

	getAllFlags() {
		return new Set(this.#flags);
	}

	/** @complexity `n` */
	getUnknownFlags() {
		return this.#flags.filter(flag => /\{\{.+\}\}/.test(flag));
	}

	/** @complexity `n` */
	getEffectiveFlags() {
		const {variants} = this.getAttribute('config'),
			variantFlags = this.#flags.filter(flag => variants.includes(flag)),
			unknownFlags = this.getUnknownFlags();
		if (variantFlags.length) {
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
			if (hasT && hasD) {
				return new Set(['+', 'H', 'T', 'D']);
			}
			return new Set(['+', 'H', ...hasT ? ['T'] : [], ...hasD ? ['D'] : [], ...unknownFlags]);
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

	/** @param {string} flag */
	hasFlag(flag) {
		if (typeof flag !== 'string') {
			this.typeError('hasFlag', 'String');
		}
		return this.#flags.includes(flag);
	}

	/**
	 * @param {string} flag
	 * @complexity `n`
	 */
	hasEffectiveFlag(flag) {
		if (typeof flag !== 'string') {
			this.typeError('hasFlag', 'String');
		}
		return this.getEffectiveFlags().has(flag);
	}

	/**
	 * @param {string} flag
	 * @complexity `n²`
	 */
	removeFlag(flag) {
		for (const token of this.getFlagToken(flag)) {
			token.remove();
		}
	}

	/**
	 * @param {string} flag
	 * @complexity `n`
	 */
	#newFlag(flag) {
		const token = Parser.run(() => new AtomToken(flag, 'converter-flag', this.getAttribute('config')));
		this.appendChild(token);
	}

	/**
	 * @param {string} flag
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
	 * @param {string} flag
	 * @complexity `n²`
	 */
	toggleFlag(flag) {
		if (!this.#flags.includes(flag)) {
			this.#newFlag(flag);
		} else {
			this.removeFlag(flag);
		}
	}
}

Parser.classes.ConverterFlagsToken = __filename;
module.exports = ConverterFlagsToken;
