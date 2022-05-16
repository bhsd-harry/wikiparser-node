'use strict';
const numberToString = n => typeof n === 'number' ? String(n) : n,
	typeError = (...args) => {
		throw new TypeError(`仅接受${args.join('、')}作为输入参数！`);
	};

/**
 * @param {?(string|number|Token|Array.<string|Token>|Set.<string|Token>)} input
 */
class TokenCollection extends Array {
	constructor(...args) {
		if (args.length === 1 && (Array.isArray(args[0]) || args[0] instanceof Set)) {
			super(...args[0]);
		} else if (args.length === 1 && args[0] === 0) {
			super();
		} else {
			super(...args.map(numberToString));
		}
	}

	// ------------------------------ extended superclass ------------------------------ //

	add(...args) {
		const arr = this.concat(...args);
		if (arr.some(ele => typeof ele === 'string')) {
			throw new RangeError('TokenCollection.add方法仅用于不包含字符串的情形！');
		}
		return $.from(arr);
	}

	delete(arg) {
		const index = this.indexOf(arg);
		if (index >= 0 && (typeof arg !== 'string' || this.lastIndexOf(arg) === index)) {
			this.splice(index, 1);
		} else if (index >= 0 && typeof arg === 'string') {
			throw new RangeError('无法删除有重复的字符串！');
		}
		return this;
	}

	forEach(...args) {
		super.forEach(...args);
		return this;
	}

	/** @returns {array} */
	flatMap(...args) {
		return [...this].flatMap(...args);
	}

	/**
	 * @param {string} method
	 * @param {string} selector
	 * @returns {TokenCollection.<Token>}
	 */
	#flatMap(method, selector) {
		return $.from(this.filterTokens().flatMap(token => token[method](selector)));
	}

	/**
	 * @param {string} method
	 * @param {string} selector
	 * @returns {TokenCollection.<Token>}
	 */
	#tryFlatMap(method, selector) {
		return $.from(
			this.flatMap(token => {
				try {
					return token[method](selector);
				} catch {
					return null;
				}
			}).filter(ele => ele !== null),
		);
	}

	/** @returns {array} */
	map(...args) {
		return [...this].map(...args);
	}

	/**
	 * @param {string} method
	 * @param {string} selector
	 * @returns {TokenCollection.<Token>}
	 */
	#map(method, selector) {
		return $.from(this.filterTokens().map(token => token[method](selector)).filter(token => token !== null));
	}

	/**
	 * @param {string} method
	 * @param {string} selector
	 * @returns {TokenCollection.<Token>}
	 */
	#tryMap(method, selector) {
		return $.from(
			this.map(token => {
				try {
					return token[method](selector);
				} catch {
					return null;
				}
			}).filter(ele => ele !== null),
		);
	}

	join(separator) {
		return this.map(String).join(separator);
	}

	toString() {
		return this.join('');
	}

	/**
	 * @param {function|string}
	 * @returns {TokenCollection}
	 */
	filter(...args) {
		if (typeof args[0] === 'string') {
			return this.filter(token => typeof token !== 'string' && token.is(args[0]));
		}
		return super.filter.apply(this, args);
	}

	/** @returns {TokenCollection} */
	filterTokens() {
		return this.filter(token => typeof token !== 'string');
	}

	/**
	 * @param {string} selector
	 * @returns {TokenCollection}
	 */
	not(selector) {
		return this.filter(token => typeof token !== 'string' && !token.is(selector));
	}

	// ------------------------------ traversing ------------------------------ //

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	parent(selector) {
		return this.#map('parent', selector);
	}

	/**
	 * @param {string} selector
	 * @returns {TokenCollection}
	 */
	closest(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		return this.#map('closest', selector);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	parents(selector) {
		return this.#flatMap('parents', selector);
	}

	/**
	 * @param {string} selector
	 * @returns {TokenCollection}
	 */
	parentsUntil(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		return this.#flatMap('parentsUntil', selector);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	children(selector) {
		return this.#flatMap('children', selector);
	}

	/**
	 * 为避免重复和实现maxDepth，必须采取广度优先搜索
	 * @param {string} selector
	 * @param {function(Token)} callback
	 * @param {number} maxDepth - 0 表示当前层级
	 * @param {Set.<Token>} visited
	 */
	each(...args) {
		if (this.length === 0) {
			return;
		}
		let selector, callback, maxDepth, visited;
		if (args.length === 4) {
			[selector, callback, maxDepth, visited] = args;
		} else {
			selector = args.find(arg => typeof arg === 'string') ?? '';
			callback = args.find(arg => typeof arg === 'function');
			maxDepth = args.find(arg => typeof arg === 'number') ?? Infinity;
			visited = args.find(arg => arg instanceof Set) ?? new Set();
		}
		if (maxDepth < 0) {
			return;
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
	 * 为避免重复和实现maxDepth，必须采取广度优先搜索
	 * @param {?string} selector
	 * @param {number} maxDepth
	 * @param {Set.<Token>} visited
	 * @returns {TokenCollection}
	 */
	search(selector, maxDepth = Infinity, visited = new Set()) {
		if (typeof maxDepth !== 'number') {
			typeError('Number');
		} else if (maxDepth < 0 || this.length === 0) {
			return $();
		}
		const filtered = this.filter(token => typeof token !== 'string' && !visited.has(token))
			.forEach(token => {
				visited.add(token);
			});
		return filtered.filter(selector).concat(filtered.children().search(selector, maxDepth - 1, visited));
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	has(selector) {
		return this.filter(token => typeof token !== 'string' && token.has(selector));
	}

	/**
	 * @param {function|string}
	 * @returns {?(string|Token)}
	 */
	find(...args) {
		if (typeof args[0] === 'function') {
			return super.find(...args);
		} else if (typeof args[0] === 'string') {
			return this.find(token => typeof token !== 'string' && token.is(args[0]));
		}
		typeError('Function', 'String');
	}

	/**
	 * @param {function|string}
	 * @returns {number}
	 */
	findIndex(...args) {
		if (typeof args[0] === 'function') {
			return super.findIndex(...args);
		} else if (typeof args[0] === 'string') {
			return this.findIndex(token => typeof token !== 'string' && token.is(args[0]));
		}
		typeError('Function', 'String');
	}

	/** @returns {TokenCollection} */
	even() {
		return this.filter((_, i) => i % 2 === 0);
	}

	/** @returns {TokenCollection} */
	odd() {
		return this.filter((_, i) => i % 2 === 1);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	next(selector) {
		return this.#tryMap('next', selector);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	prev(selector) {
		return this.#tryMap('prev', selector);
	}

	/**
	 * @param {string} selector
	 * @returns {TokenCollection}
	 */
	nextAll(selector) {
		if (selector === undefined) {
			throw new TypeError('TokenCollection.nextAll必须指定选择器（可以为空）！');
		}
		return this.#tryFlatMap('nextAll', selector);
	}

	/**
	 * @param {string} selector
	 * @returns {TokenCollection}
	 * @throws Error
	 */
	prevAll(selector) {
		if (selector === undefined) {
			throw new TypeError('TokenCollection.prevAll必须指定选择器（可以为空）！');
		}
		return this.#tryFlatMap('prevAll', selector);
	}

	/**
	 * @param {string} selector
	 * @returns {TokenCollection}
	 */
	siblings(selector) {
		if (selector === undefined) {
			throw new TypeError('TokenCollection.siblings必须指定选择器（可以为空）！');
		}
		return this.#tryFlatMap('siblings', selector);
	}

	// ------------------------------ batch manipulation ------------------------------ //

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

const $ = (...args) => new TokenCollection(...args);

$.class = TokenCollection;

/**
 * @param {Token[]|Set.<Token>} arr
 * @returns {TokenCollection.<Token>}
 */
$.from = arr => {
	if (arr instanceof Set) {
		return $(arr);
	} else if (!Array.isArray(arr)) {
		typeError('Array', 'Set');
	}
	return $(new Set(arr));
};

$.reload = () => {
	const [id] = Object.entries(require.cache).find(([, mod]) => mod.exports.typeError === typeError);
	delete require.cache[id];
	return require(id).$;
};

module.exports = {$, numberToString, typeError};
