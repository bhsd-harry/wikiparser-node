/* eslint-disable no-param-reassign */
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
		} else {
			super(...args.map(numberToString));
		}
	}

	// ------------------------------ extended superclass ------------------------------ //

	forEach(...args) {
		super.forEach.apply(this, args);
		return this;
	}

	/** @returns {array} */
	flatMap(...args) {
		return [...this].flatMap(...args);
	}

	/**
	 * @param {string} method
	 * @param {string} selector
	 * @returns {TokenCollection}
	 */
	#flatMap(method, selector) {
		return $.from(this.filterTokens().flatMap(token => token[method](selector)));
	}

	/**
	 * @param {string} method
	 * @param {string} selector
	 * @returns {TokenCollection}
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
	 * @returns {TokenCollection}
	 */
	#map(method, selector) {
		return $.from(this.filterTokens().map(token => token[method](selector)).filter(token => token !== null));
	}

	/**
	 * @param {string} method
	 * @param {string} selector
	 * @returns {TokenCollection}
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
	 * @param {string} selector
	 * @param {function(Token)} callback
	 * @param {number} maxDepth - 0 表示当前层级
	 */
	each(...args) {
		const selector = args.find(arg => typeof arg === 'string') ?? '',
			callback = args.find(arg => typeof arg === 'function'),
			maxDepth = args.find(arg => typeof arg === 'number') ?? Infinity;
		if (maxDepth < 0) {
			return;
		} else if (callback.constructor.name !== 'AsyncFunction') {
			for (const token of this) {
				if (typeof token === 'string') {
					continue;
				}
				token.each(selector, callback, maxDepth);
			}
			return this;
		}
		return (async () => {
			for (const token of this) {
				if (typeof token === 'string') {
					continue;
				}
				await token.each(selector, callback, maxDepth); // eslint-disable-line no-await-in-loop
			}
			return this;
		})();
	}

	/**
	 * @param {?string} selector
	 * @param {number} maxDepth
	 * @returns {TokenCollection}
	 */
	search(selector, maxDepth = Infinity) {
		if (typeof maxDepth !== 'number') {
			typeError('Number');
		}
		return $(maxDepth < 0
			? []
			: this.filterTokens().flatMap(token => [
				...token.is(selector) ? [token] : [],
				...token.$children.search(selector, maxDepth - 1),
			]),
		);
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
			return super.find.apply(this, args);
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
			return super.findIndex.apply(this, args);
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
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	nextAll(selector) {
		return this.#tryFlatMap('nextAll', selector);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 * @throws Error
	 */
	prevAll(selector) {
		return this.#tryFlatMap('prevAll', selector);
	}

	/**
	 * @param {string} selector
	 * @returns {TokenCollection}
	 */
	nextUntil(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		return this.#tryFlatMap('nextUntil', selector);
	}

	/**
	 * @param {string} selector
	 * @returns {TokenCollection}
	 */
	prevUntil(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		return this.#tryFlatMap('prevUntil', selector);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	siblings(selector) {
		return this.#tryFlatMap('siblings', selector);
	}

	// ------------------------------ batch manipulation ------------------------------ //

	detach() {
		return this.forEach(token => {
			try {
				token.detach();
			} catch {}
		});
	}

	remove() {
		return this.forEach(token => {
			token.remove();
		});
	}

	/**
	 * @param {Token[]|Set.<Token>} arr
	 * @returns {TokenCollection}
	 */
	static from(arr) {
		if (arr instanceof Set) {
			return $(arr);
		} else if (!Array.isArray(arr)) {
			typeError('Array', 'Set');
		}
		return arr.some(ele => typeof ele === 'string') ? $(arr) : $(new Set(arr));
	}
}

const $ = (...args) => new TokenCollection(...args);
$.class = TokenCollection;
$.reload = () => {
	delete require.cache[require.resolve('./tokenCollection')];
	return require('./tokenCollection');
};

module.exports = {$, numberToString, typeError};
