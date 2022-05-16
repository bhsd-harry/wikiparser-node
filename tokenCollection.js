'use strict';
const {numberToString, typeError, tokenIs, tokenLike} = require('./util');

class TokenCollection extends Array {
	/**
	 * 首先Array或Set会被展开，然后number会被转成string
	 * @param {...string|number|Token|(string|number|Token)[]|Set<Token>} args
	 */
	constructor(...args) {
		if (args.length === 0 || args.length === 1 && args[0] === 0) {
			super();
			return;
		}
		super(
			...args.flatMap(arg => Array.isArray(arg) || arg instanceof Set ? [...arg] : [arg])
				.map(numberToString).filter(tokenLike),
		);
	}

	// ------------------------------ override superclass ------------------------------ //

	forEach(...args) {
		super.forEach(...args);
		return this;
	}

	flatMap(...args) {
		return [...this].flatMap(...args);
	}

	map(...args) {
		return [...this].map(...args);
	}

	/** @returns {string} */
	join(separator = '') {
		return this.map(String).join(separator);
	}

	/** 使用空字符串join */
	toString() {
		return this.join('');
	}

	text() {
		return this.toString();
	}

	/**
	 * 参数为字符串时当作Token选择器
	 * @param {...string|function(any): boolean} args
	 * @returns {TokenCollection}
	 */
	filter(...args) {
		if (typeof args[0] === 'string') {
			return super.filter(token => tokenIs(args[0], token));
		}
		return super.filter(...args);
	}

	/**
	 * 参数为字符串时当作Token选择器
	 * @param {...string|Token|function(any): boolean} args
	 * @returns {?string|Token}
	 */
	find(...args) {
		if (tokenLike(args[0])) {
			return super.find(token => tokenIs(args[0], token));
		}
		return super.find(...args);
	}

	/**
	 * 参数为字符串时当作Token选择器
	 * @param {...string|Token|function(any): boolean} args
	 */
	findIndex(...args) {
		if (tokenLike(args[0])) {
			return super.findIndex(token => tokenIs(args[0], token));
		}
		return super.findIndex(...args);
	}

	// ------------------------------ extended superclass ------------------------------ //

	/**
	 * 删除指定Token
	 * @param {Token} arg
	 * @throws RangeError: 重复出现的元素
	 */
	delete(arg) {
		const Token = require('./token');
		if (!(arg instanceof Token)) {
			typeError('Token');
		}
		const index = this.indexOf(arg);
		if (index === -1) {
			Token.warn(true, '不存在该指定Token！');
			return;
		} else if (this.lastIndexOf(arg) > index) {
			throw new RangeError('无法删除重复出现的元素！');
		}
		this.splice(index, 1);
		return this;
	}

	// ------------------------------ supplementary filter ------------------------------ //

	even() {
		return this.filter((_, i) => i % 2 === 0);
	}

	odd() {
		return this.filter((_, i) => i % 2 === 1);
	}

	/** @param  {...number|string} args */
	eq(...args) {
		const {Ranges} = require('./range');
		return $(new Ranges(args).applyTo(this).map(i => this[i]));
	}

	filterTokens() {
		return $.from(this);
	}

	/**
	 * @param {string|Token} selector
	 * @returns {UniqueCollection}
	 */
	not(selector) {
		return this.filterTokens().filter(token => !token.is(selector));
	}

	/**
	 * @param {string|Token} selector
	 * @returns {UniqueCollection}
	 */
	has(selector) {
		return this.filterTokens().filter(token => token.has(selector));
	}

	// ------------------------------ private tools ------------------------------ //

	/**
	 * 仅对Token元素执行flatMap
	 * @param {string} method
	 * @param {string|undefined} selector
	 */
	#flatMap(method, selector) {
		return $.from(this.filterTokens().flatMap(token => token[method](selector)));
	}

	/**
	 * 仅对Token元素执行flatMap，并忽略错误
	 * @param {string} method
	 * @param {string|undefined} selector
	 */
	#tryFlatMap(method, selector) {
		return $.from(
			this.filterTokens().flatMap(token => {
				try {
					return token[method](selector);
				} catch {
					return null;
				}
			}).filter(ele => ele !== null),
		);
	}

	/**
	 * 仅对Token元素执行map
	 * @param {string} method
	 * @param {string|undefined} selector
	 */
	#map(method, selector) {
		return $.from(this.filterTokens().map(token => token[method](selector)).filter(token => token !== null));
	}

	/**
	 * 仅对Token元素执行map，并忽略错误
	 * @param {string} method
	 * @param {string|undefined} selector
	 */
	#tryMap(method, selector) {
		return $.from(
			this.filterTokens().map(token => {
				try {
					return token[method](selector);
				} catch {
					return null;
				}
			}).filter(ele => ele !== null),
		);
	}

	// ------------------------------ traversing ------------------------------ //

	parent(selector = '') {
		return this.#map('parent', selector);
	}

	/** @param {string} selector */
	closest(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		return this.#map('closest', selector);
	}

	parents(selector = '') {
		return this.#flatMap('parents', selector);
	}

	/** @param {string|Token} selector */
	parentsUntil(selector) {
		const Token = require('./token');
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		}
		return this.#flatMap('parentsUntil', selector);
	}

	children(selector = '') {
		return this.#flatMap('children', selector);
	}

	/**
	 * 广度优先依次执行操作
	 * @param {...string|function(Token): void|number|Set<Token>} args
	 * @param selector
	 * @param callback
	 * @param maxDepth - 0 表示当前层级
	 * @param visited
	 */
	each(...args) {
		if (this.length === 0) {
			return this;
		}
		let /** @type {string} */ selector,
			/** @type {function(Token): void|Promise<void>} */ callback,
			/** @type {number} */ maxDepth,
			/** @type {Set<Token>} */ visited;
		if (args.length === 4) {
			[selector = '', callback, maxDepth = Infinity, visited = new Set()] = args;
		} else {
			selector = args.find(arg => typeof arg === 'string') ?? '';
			callback = args.find(arg => typeof arg === 'function');
			maxDepth = args.find(arg => typeof arg === 'number') ?? Infinity;
			visited = args.find(arg => arg instanceof Set) ?? new Set();
		}
		if (maxDepth < 0) {
			return this;
		} else if (callback.constructor.name !== 'AsyncFunction') {
			for (const token of this.filter(selector)) {
				if (!visited.has(token)) {
					visited.add(token);
					callback(token);
				}
			}
			this.children().each(selector, callback, maxDepth - 1, visited);
			return this;
		}
		return (async () => {
			for (const token of this.filter(selector)) {
				if (!visited.has(token)) {
					visited.add(token);
					await callback(token); // eslint-disable-line no-await-in-loop
				}
			}
			await this.children().each(selector, callback, maxDepth - 1, visited);
			return this;
		})();
	}

	/**
	 * 广度优先搜索
	 * @param {string} selector
	 * @param {Set<Token>} visited
	 * @returns {UniqueCollection}
	 */
	search(selector, maxDepth = Infinity, visited = new Set()) {
		if (typeof selector !== 'string' || typeof maxDepth !== 'number') {
			typeError('String', 'Number');
		} else if (maxDepth < 0 || this.length === 0) {
			return $.from([]);
		}
		/** @type {UniqueCollection} */
		const $filtered = this.filterTokens().filter(token => !visited.has(token)).forEach(token => {
			visited.add(token);
		});
		return $filtered.filter(selector).concat($filtered.children().search(selector, maxDepth - 1, visited));
	}

	/** @param {string|undefined} selector */
	next(selector) {
		return this.#tryMap('next', selector);
	}

	/** @param {string|undefined} selector */
	prev(selector) {
		return this.#tryMap('prev', selector);
	}

	/** @param {string} selector */
	nextAll(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		return this.#tryFlatMap('nextAll', selector);
	}

	/** @param {string} selector */
	prevAll(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		return this.#tryFlatMap('prevAll', selector);
	}

	/** @param {string} selector */
	siblings(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		return this.#tryFlatMap('siblings', selector);
	}
}

class UniqueCollection extends TokenCollection {
	/** @param {...Token|Token[]|Set<Token>} args */
	constructor(...args) {
		if (args.length === 0 || args.length === 1 && args[0] === 0) {
			super();
			return;
		}
		const Token = require('./token');
		super(new Set(
			args.flatMap(arg => Array.isArray(arg) || arg instanceof Set ? arg : [arg])
				.filter(arg => arg instanceof Token),
		));
	}

	/** @param {...Token} args */
	push(...args) {
		const Token = require('./token');
		super.push(...new Set(args.filter(arg => arg instanceof Token && !this.includes(arg))));
	}

	concat(...args) {
		return $.from(super.concat(...args));
	}

	detach() {
		let count = 0;
		this.forEach(token => {
			try {
				token.detach();
			} catch {
				count++;
			}
		});
		if (count) {
			console.error('\x1b[31m%s\x1b[0m', `共有${count}个元素未能成功！`);
		}
		return this;
	}

	remove() {
		return this.forEach(token => {
			token.remove();
		});
	}
}

// ------------------------------ wrapper for class ------------------------------ //

const $ = (...args) => new TokenCollection(...args);

$.TokenCollection = TokenCollection;

$.UniqueCollection = UniqueCollection;

/** @param {Token[]|Set<Token>} arr */
$.from = arr => new UniqueCollection(arr);

module.exports = $;
