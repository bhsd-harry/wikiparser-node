'use strict';

const {typeError, externalUse} = require('../util/debug'),
	{text, noWrap} = require('../util/string'),
	Token = require('../src'),
	assert = require('assert/strict');

const /** @type {WeakMap<Token, Record<string, any>>} */ dataStore = new WeakMap();

/**
 * @param {string} method
 * @param {string|Token|Token[]} selector
 * @returns {(token: Token) => boolean}
 */
const matchesGenerator = (method, selector) => {
	if (typeof selector === 'string') {
		return token => token instanceof Token && token.matches(selector);
	} else if (Array.isArray(selector)) {
		return token => selector.includes(token);
	} else if (selector instanceof Token) {
		return token => token === selector;
	}
	typeError(TokenCollection, method, 'String', 'Token', 'Array');
};

/** @extends {Array<Token>} */
class TokenCollection extends Array {
	/** @type {TokenCollection} */ prevObject;
	/** @type {Set<Token>} */ #roots = new Set();

	/** @param {...string|Token} arr */
	constructor(...arr) {
		super();
		if (arr.length === 1 && arr[0] === 0) {
			return;
		}
		for (const token of arr) {
			if (token === undefined) {
				continue;
			} else if (typeof token === 'string') {
				this.push(token);
			} else if (!(token instanceof Token)) {
				this.typeError('constructor', 'String', 'Token');
			} else if (!this.includes(token)) {
				this.#roots.add(token.getRootNode());
				this.push(token);
			}
		}
		Object.defineProperty(this, 'prevObject', {enumerable: false});
		this.#sort();
	}

	/**
	 * @param {string} method
	 * @param  {...string} types
	 */
	typeError(method, ...types) {
		return typeError(this.constructor, method, ...types);
	}

	#sort() {
		if (this.some(token => typeof token === 'string')) {
			return;
		}
		const rootArray = [...this.#roots];
		this.sort((a, b) => {
			const aRoot = a.getRootNode(),
				bRoot = b.getRootNode();
			return aRoot === bRoot ? a.comparePosition(b) : rootArray.indexOf(aRoot) - rootArray.indexOf(bRoot);
		});
	}

	toArray() {
		return Array.from(this);
	}

	_filter(selector = '') {
		const arr = this.toArray().filter(ele => ele instanceof Token);
		if (selector) {
			return arr.filter(ele => ele.matches(selector));
		}
		return arr;
	}

	_find() {
		return super.find(ele => ele instanceof Token);
	}

	/** @param {(arr: Token[]) => (string|Token)[]} map */
	_create(map, filter = '') {
		const $arr = $(map(this._filter())),
			$filtered = filter ? $arr.filter(filter) : $arr;
		$filtered.prevObject = this;
		return $filtered;
	}

	/**
	 * @template {unknown} T
	 * @param {T} num
	 * @returns {T extends number ? string|Token : (string|Token)[]}
	 */
	get(num) {
		if (typeof num === 'number') {
			return this.at(num);
		}
		return this.toArray();
	}

	/** @param {CollectionCallback<void, string|Token>} callback */
	each(callback) {
		this.forEach((ele, i) => { // 不能使用`for`...`of`
			callback.call(ele, i, ele);
		});
		return this;
	}

	/** @param {CollectionCallback<any, string|Token>} callback */
	map(callback) {
		const arr = this.toArray().map((ele, i) => callback.call(ele, i, ele));
		try {
			const $arr = $(arr);
			$arr.prevObject = this;
			return $arr;
		} catch {
			return arr;
		}
	}

	/**
	 * @param {number} start
	 * @param {number} end
	 */
	slice(start, end) {
		const $arr = $(this.toArray().slice(start, end));
		$arr.prevObject = this;
		return $arr;
	}

	first() {
		return this.slice(0, 1);
	}

	last() {
		return this.slice(-1);
	}

	/** @param {number} i */
	eq(i) {
		return this.slice(i, i === -1 ? undefined : i + 1);
	}

	/** 使用空字符串join */
	toString() {
		return this.toArray().map(String).join('');
	}

	/**
	 * @template {unknown} T
	 * @param {T} str
	 * @returns {T extends string|Function ? this : string}
	 */
	text(str) {
		/** @type {(ele: Token, i: number, str: string) => string} */
		const callback = typeof str === 'function' ? str.call : () => str;
		if (typeof str === 'string' || typeof str === 'function') {
			for (const [i, ele] of this.entries()) {
				if (ele instanceof Token) {
					try {
						ele.replaceChildren(callback(ele, i, ele.text()));
					} catch {}
				}
			}
			return this;
		}
		return text(this.toArray());
	}

	/** @param {string|CollectionCallback<boolean, string|Token>|Token|Token[]} selector */
	is(selector) {
		if (typeof selector === 'function') {
			return this.some((ele, i) => selector.call(ele, i, ele));
		}
		const matches = matchesGenerator('is', selector);
		return this.some(matches);
	}

	/** @param {string|CollectionCallback<boolean, string|Token>|Token|Token[]} selector */
	filter(selector) {
		const arr = this.toArray();
		let $arr;
		if (typeof selector === 'function') {
			$arr = $(arr.filter((ele, i) => selector.call(ele, i, ele)));
		} else {
			const matches = matchesGenerator('filter', selector);
			$arr = $(arr.filter(matches));
		}
		$arr.prevObject = this;
		return $arr;
	}

	/** @param {string|CollectionCallback<boolean, string|Token>|Token|Token[]} selector */
	not(selector) {
		const arr = this.toArray();
		let $arr;
		if (typeof selector === 'function') {
			$arr = $(arr.filter((ele, i) => !selector.call(ele, i, ele)));
		} else if (typeof selector === 'string') {
			$arr = $(arr.filter(ele => ele instanceof Token && !ele.matches(selector)));
		} else {
			const matches = matchesGenerator('not', selector);
			$arr = $(arr.filter(ele => !matches(ele)));
		}
		$arr.prevObject = this;
		return $arr;
	}

	/** @param {string|Token|Token[]} selector */
	find(selector) {
		let /** @type {CollectionMap} */ map;
		if (typeof selector === 'string') {
			map = arr => arr.flatMap(token => token.querySelectorAll(selector));
		} else if (Array.isArray(selector)) {
			map = arr => [...selector].filter(ele => arr.some(token => token.contains(ele)));
		} else if (selector instanceof Token) {
			map = arr => arr.some(token => token.contains(selector)) ? [selector] : [];
		} else {
			this.typeError('find', 'String', 'Token', 'Array');
		}
		return this._create(map);
	}

	/** @param {string|Token} selector */
	has(selector) {
		const arr = this._filter();
		if (typeof selector === 'string') {
			return arr.some(ele => ele.querySelector(selector));
		} else if (selector instanceof Token) {
			return arr.some(ele => ele.contains(selector));
		}
		this.typeError('has', 'String', 'Token');
	}

	/** @param {string} selector */
	closest(selector) {
		if (typeof selector !== 'string') {
			this.typeError('closest', 'String');
		}
		return this._create(arr => arr.map(ele => ele.closest(selector)));
	}

	index() {
		const firstToken = this._find();
		if (!firstToken) {
			return -1;
		}
		const {parentNode} = firstToken;
		return parentNode ? parentNode.childNodes.indexOf(firstToken) : 0;
	}

	/** @param {string|Token|(string|Token)[]} elements */
	add(elements) {
		elements = Array.isArray(elements) ? elements : [elements];
		const $arr = $([...this, ...elements]);
		$arr.prevObject = this;
		return $arr;
	}

	/** @param {string} selector */
	addBack(selector) {
		return this.add(selector ? this.prevObject.filter(selector) : this.prevObject);
	}

	parent(selector = '') {
		return this._create(arr => arr.map(ele => ele.parentNode), selector);
	}

	parents(selector = '') {
		return this._create(arr => arr.flatMap(ele => ele.getAncestors()), selector);
	}

	next(selector = '') {
		return this._create(arr => arr.map(ele => ele.nextElementSibling), selector);
	}

	prev(selector = '') {
		return this._create(arr => arr.map(ele => ele.previousElementSibling), selector);
	}

	/**
	 * @param {number|(i: number) => number} start
	 * @param {number|(i: number) => number} count
	 */
	_siblings(start, count, selector = '') {
		return this._create(arr => arr.flatMap(ele => {
			const {parentElement} = ele;
			if (!parentElement) {
				return undefined;
			}
			const {children} = parentElement,
				i = children.indexOf(ele);
			children.splice(
				typeof start === 'function' ? start(i) : start,
				typeof count === 'function' ? count(i) : count,
			);
			return children;
		}), selector);
	}

	nextAll(selector = '') {
		return this._siblings(0, i => i + 1, selector);
	}

	prevAll(selector = '') {
		return this._siblings(i => i, Infinity, selector);
	}

	siblings(selector = '') {
		return this._siblings(i => i, 1, selector);
	}

	/**
	 * @param {'parents'|'nextAll'|'prevAll'} method
	 * @param {string|Token|Token[]} selector
	 */
	_until(method, selector, filter = '') {
		const matches = matchesGenerator(`${method.replace(/All$/, '')}Until`, selector);
		return this._create(arr => arr.flatMap(ele => {
			const tokens = $(ele)[method]().toArray(),
				tokenArray = method === 'nextAll' ? tokens : tokens.reverse(),
				until = tokenArray.findIndex(end => matches(end));
			return tokenArray.slice(0, until);
		}), filter);
	}

	/** @param {string|Token|Token[]} selector */
	parentsUntil(selector, filter = '') {
		return this._until('parents', selector, filter);
	}

	/** @param {string|Token|Token[]} selector */
	nextUntil(selector, filter = '') {
		return this._until('nextAll', selector, filter);
	}

	/** @param {string|Token|Token[]} selector */
	prevUntil(selector, filter = '') {
		return this._until('prevAll', selector, filter);
	}

	children(selector = '') {
		return this._create(arr => arr.flatMap(ele => ele.children), selector);
	}

	contents() {
		return this._create(arr => arr.flatMap(ele => ele.childNodes));
	}

	/** @param {[string|Record<string, any>]} key */
	data(key, value) {
		if (value !== undefined && typeof key !== 'string') {
			this.typeError('data', 'String');
		} else if (value === undefined && typeof key !== 'object') {
			const data = $.dataStore.get(this._find());
			return key === undefined ? data : data?.[key];
		}
		for (const token of this._filter()) {
			if (!$.dataStore.has(token)) {
				$.dataStore.set(token, {});
			}
			const data = $.dataStore.get(token);
			if (typeof key === 'string') {
				data[key] = value;
			} else {
				Object.assign(data, key);
			}
		}
		return this;
	}

	/** @param {string|string[]} name */
	removeData(name) {
		if (name !== undefined && typeof name !== 'string' && !Array.isArray(name)) {
			this.typeError('removeData', 'String', 'Array');
		}
		name = typeof name === 'string' ? name.split(/\s/) : name;
		for (const token of this._filter()) {
			if (!$.dataStore.has(token)) {
				continue;
			} else if (name === undefined) {
				$.dataStore.delete(token);
			} else {
				const data = $.dataStore.get(token);
				for (const key of name) {
					delete data[key];
				}
			}
		}
		return this;
	}

	/**
	 * @param {string|Record<string, AstListener>} events
	 * @param {string|AstListener} selector
	 * @param {AstListener} handler
	 */
	_addEventListener(events, selector, handler, once = false) {
		if (typeof events !== 'string' && typeof events !== 'object') {
			this.typeError(once ? 'once' : 'on', 'String', 'Object');
		} else if (typeof selector === 'function') {
			handler = selector;
			selector = undefined;
		}
		const eventPair = typeof events === 'string'
			? events.split(/\s/).map(/** @returns {[string, AstListener]} */ event => [event, handler])
			: Object.entries(events);
		for (const token of this._filter(selector)) {
			for (const [event, listener] of eventPair) {
				token.addEventListener(event, listener, {once});
			}
		}
		return this;
	}

	/**
	 * @param {string|Record<string, AstListener>} events
	 * @param {string|AstListener} selector
	 * @param {AstListener} handler
	 */
	on(events, selector, handler) {
		return this._addEventListener(events, selector, handler);
	}

	/**
	 * @param {string|Record<string, AstListener>} events
	 * @param {string|AstListener} selector
	 * @param {AstListener} handler
	 */
	one(events, selector, handler) {
		return this._addEventListener(events, selector, handler, true);
	}

	/**
	 * @param {string|Record<string, AstListener>|undefined} events
	 * @param {string|AstListener} selector
	 * @param {AstListener} handler
	 */
	off(events, selector, handler) {
		if (typeof events !== 'string' && typeof events !== 'object' && events !== undefined) {
			this.typeError('off', 'String', 'Object');
		}
		handler = typeof selector === 'function' ? selector : handler;
		let eventPair;
		if (events) {
			eventPair = typeof events === 'string'
				? events.split(/\s/).map(/** @returns {[string, AstListener]} */ event => [event, handler])
				: Object.entries(events);
		}
		for (const token of this._filter(selector)) {
			if (events === undefined) {
				token.removeAllEventListeners();
			} else {
				for (const [event, listener] of eventPair) {
					if (typeof event !== 'string' || typeof listener !== 'function' && listener !== undefined) {
						this.typeError('off', 'String', 'Function');
					} else if (listener) {
						token.removeEventListener(event, listener);
					} else {
						token.removeAllEventListeners(event);
					}
				}
			}
		}
		return this;
	}

	/** @param {string|Event} event */
	trigger(event, data) {
		for (const token of this._filter()) {
			const e = typeof event === 'string' ? new Event(event, {bubbles: true}) : new Event(event.type, event);
			token.dispatchEvent(e, data);
		}
		return this;
	}

	/** @param {string|Event} event */
	triggerHandler(event, data) {
		const firstToken = this._find();
		if (!firstToken) {
			return;
		}
		const e = typeof event === 'string' ? new Event(event) : event,
			listeners = firstToken.listEventListeners(typeof event === 'string' ? event : event.type);
		let result;
		for (const listener of listeners) {
			result = listener(e, data);
		}
		return result;
	}

	/**
	 * @param {'append'|'prepend'|'before'|'after'|'replaceChildren'|'replaceWith'} method
	 * @param {string|Token|CollectionCallback<string|Token|(string|Token)[], string>} content
	 * @param  {...string|Token|(string|Token)[]} additional
	 */
	_insert(method, content, ...additional) {
		if (typeof content === 'function') {
			for (const [i, token] of this.entries()) {
				if (token instanceof Token) {
					const result = content.call(token, i, token.toString());
					if (typeof result === 'string' || result instanceof Token) {
						token[method](result);
					} else if (Array.isArray(result)) {
						token[method](...result);
					} else {
						this.typeError(method, 'String', 'Token');
					}
				}
			}
		} else {
			for (const token of this) {
				if (token instanceof Token) {
					token[method](...content, ...additional.flat());
				}
			}
		}
		return this;
	}

	/**
	 * @param {string|Token|CollectionCallback<string|Token|(string|Token)[], string>} content
	 * @param  {...string|Token|(string|Token)[]} additional
	 */
	append(content, ...additional) {
		return this._insert('append', content, ...additional);
	}

	/**
	 * @param {string|Token|CollectionCallback<string|Token|(string|Token)[], string>} content
	 * @param  {...string|Token|(string|Token)[]} additional
	 */
	prepend(content, ...additional) {
		return this._insert('prepend', content, ...additional);
	}

	/**
	 * @param {string|Token|CollectionCallback<string|Token|(string|Token)[], string>} content
	 * @param  {...string|Token|(string|Token)[]} additional
	 */
	before(content, ...additional) {
		return this._insert('before', content, ...additional);
	}

	/**
	 * @param {string|Token|CollectionCallback<string|Token|(string|Token)[], string>} content
	 * @param  {...string|Token|(string|Token)[]} additional
	 */
	after(content, ...additional) {
		return this._insert('after', content, ...additional);
	}

	/**
	 * @template {unknown} T
	 * @param {T} content
	 * @returns {T extends string|Token|CollectionCallback<string|Token|(string|Token)[], string> ? this : string}
	 */
	html(content) {
		if (content === undefined) {
			return this.toString();
		}
		return this._insert('replaceChildren', content);
	}

	/** @param {string|Token|CollectionCallback<string|Token|(string|Token)[], string>} content */
	replaceWith(content) {
		return this._insert('replaceWith', content);
	}

	remove(selector = '') {
		for (const token of this.removeData()._filter(selector)) {
			token.remove();
			token.removeAllEventListeners();
		}
		return this;
	}

	detach(selector = '') {
		for (const token of this._filter(selector)) {
			token.remove();
		}
		return this;
	}

	empty() {
		for (const token of this) {
			if (token instanceof Token) {
				token.replaceChildren();
			}
		}
		return this;
	}

	/**
	 * @param {'append'|'prepend'|'before'|'after'|'replaceWith'} method
	 * @param {Token|Token[]} target
	 */
	_insertAdjacent(method, target) {
		if (target instanceof Token) {
			target[method](...this);
		} else if (Array.isArray(target)) {
			for (const token of target) {
				if (token instanceof Token) {
					token[method](...this);
				}
			}
		} else {
			this.typeError(method, 'Token', 'Array');
		}
		return this;
	}

	/** @param {Token|Token[]} target */
	appendTo(target) {
		return this._insertAdjacent('append', target);
	}

	/** @param {Token|Token[]} target */
	prependTo(target) {
		return this._insertAdjacent('prepend', target);
	}

	/** @param {Token|Token[]} target */
	insertBefore(target) {
		return this._insertAdjacent('before', target);
	}

	/** @param {Token|Token[]} target */
	insertAfter(target) {
		return this._insertAdjacent('after', target);
	}

	/** @param {Token|Token[]} target */
	replaceAll(target) {
		return this._insertAdjacent('replaceWith', target);
	}

	/** @param {string|string[]|CollectionCallback<string, string>} value */
	val(value) {
		if (value === undefined) {
			const firstToken = this._find();
			return firstToken?.getValue && firstToken.getValue();
		}
		let /** @type {(i: number, token: Token) => string} */ toValue;
		if (typeof value === 'string') {
			toValue = () => value;
		} else if (typeof value === 'function') {
			toValue = (i, token) => value.call(token, i, token.getValue && token.getValue());
		} else if (Array.isArray(value)) {
			toValue = i => value[i];
		} else {
			this.typeError('val', 'String', 'Array', 'Function');
		}
		for (const [i, token] of this.entries()) {
			if (token instanceof Token && typeof token.setValue === 'function' && token.setValue.length === 1) {
				token.setValue(toValue(i, token));
			}
		}
		return this;
	}

	/**
	 * @param {'getAttr'|'getAttribute'} getter
	 * @param {'setAttr'|'setAttribute'} setter
	 * @param {string|Record<string, string>} name
	 * @param {any|CollectionCallback<string, any>} value
	 */
	_attr(getter, setter, name, value) {
		if (typeof name === 'string' && value === undefined) {
			const firstToken = this._find();
			return firstToken?.[getter] && firstToken[getter](name);
		}
		for (const [i, token] of this.entries()) {
			if (token instanceof Token && typeof token[setter] === 'function') {
				if (typeof value === 'string') {
					token[setter](name, value);
				} else if (typeof value === 'function') {
					token[setter](name, value.call(token, i, token[getter] && token[getter](name)));
				} else if (typeof name === 'object') {
					for (const [k, v] of Object.entries(name)) {
						token[setter](k, v);
					}
				}
			}
		}
		return this;
	}

	/**
	 * @param {string|Record<string, string>} name
	 * @param {string|CollectionCallback<string, string>} value
	 */
	attr(name, value) {
		return this._attr('getAttr', 'setAttr', name, value);
	}

	/**
	 * @param {string|Record<string, string>} name
	 * @param {any|CollectionCallback<string, any>} value
	 */
	prop(name, value) {
		return this._attr('getAttribute', 'setAttribute', name, value);
	}

	/**
	 * @param {'removeAttr'|'removeAttribute'} method
	 * @param {string} name
	 */
	_removeAttr(method, name) {
		for (const token of this) {
			if (token instanceof Token && typeof token[method] === 'function') {
				token[method](name);
			}
		}
		return this;
	}

	/** @param {string} name */
	removeAttr(name) {
		return this._removeAttr('removeAttr', name);
	}

	/** @param {string} name */
	removeProp(name) {
		return this._removeAttr('removeAttribute', name);
	}

	/**
	 * 出于实用角度，与jQuery的实现方式不同
	 * @param {string[]|CollectionCallback<string[], undefined>} wrapper
	 */
	wrapAll(wrapper) {
		if (typeof wrapper !== 'function' && !Array.isArray(wrapper)) {
			this.typeError('wrapAll', 'Array', 'Function');
		}
		const firstToken = this._find(),
			error = new Error('wrapAll 的主体应为同一个父节点下的连续子节点！');
		if (!firstToken || !firstToken.parentNode) {
			throw error;
		}
		const {parentNode} = firstToken,
			{childNodes} = parentNode,
			i = childNodes.indexOf(firstToken),
			consecutiveSiblings = childNodes.slice(i, i + this.length);
		try {
			assert.deepStrictEqual(this.toArray(), consecutiveSiblings);
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw error;
			}
		}
		const ranges = parentNode.getAttribute('protectedChildren'),
			index = ranges.applyTo(childNodes).find(n => n >= i && n < i + this.length);
		if (index !== undefined) {
			throw new Error(`第 ${index} 个子节点受到保护！`);
		}
		const [pre, post] = typeof wrapper === 'function' ? wrapper.call(firstToken) : wrapper,
			config = firstToken.getRootNode().getAttribute('config'),
			token = new Token(`${pre}${this.toString()}${post}`, config).parse();
		if (token.childNodes.length !== 1) {
			throw new RangeError(`非法的 wrapper:\n${noWrap(pre)}\n${noWrap(post)}`);
		}
		for (let j = i + this.length - 1; j >= i; j--) {
			parentNode.removeAt(j);
		}
		parentNode.insertAt(token.firstChild, i);
		return this;
	}

	/**
	 * @param {'html'|'replaceWith'} method
	 * @param {string[]|CollectionCallback<string[], undefined>} wrapper
	 */
	_wrap(method, wrapper) {
		if (typeof wrapper !== 'function' && !Array.isArray(wrapper)) {
			this.typeError(method, 'Array', 'Function');
		}
		return this[method](
			/**
			 * @this {string|Token}
			 * @param {number} i
			 * @param {string} string
			 */
			function(i, string) {
				if (!(this instanceof Token)) {
					return string;
				}
				const [pre, post] = typeof wrapper === 'function' ? wrapper.call(this, i) : wrapper,
					config = this.getRootNode().getAttribute('config'),
					token = new Token(`${pre}${string}${post}`, config).parse();
				if (token.childNodes.length !== 1) {
					throw new RangeError(`非法的 wrapper:\n${noWrap(pre)}\n${noWrap(post)}`);
				}
				return token.firstChild;
			},
		);
	}

	/** @param {string[]|CollectionCallback<string[], undefined>} wrapper */
	wrapInner(wrapper) {
		return this._wrap('html', wrapper);
	}

	/** @param {string[]|CollectionCallback<string[], undefined>} wrapper */
	wrap(wrapper) {
		return this._wrap('replaceWith', wrapper);
	}

	offset() {
		const firstToken = this._find();
		if (!firstToken) {
			return;
		}
		const {top, left} = firstToken.getBoundingClientRect();
		return {top, left};
	}

	position() {
		const style = this._find()?.style;
		return style && {top: style.top, left: style.left};
	}

	height() {
		return this._find()?.offsetHeight;
	}

	width() {
		return this._find()?.offsetWidth;
	}
}

/** @param {string|Token|Iterable<string|Token>} tokens */
const $ = tokens => {
	if (typeof tokens === 'string' || tokens instanceof Token) {
		tokens = [tokens];
	}
	return new Proxy(new TokenCollection(...tokens), {
		/** @param {PropertyKey} prop */
		get(obj, prop) {
			if (prop === Symbol.iterator || typeof obj[prop] !== 'function'
				|| !prop.startsWith('_') && Object.getOwnPropertyDescriptor(obj.constructor.prototype, prop)
				|| !externalUse(prop, true)
			) {
				return obj[prop];
			}
		},
		set(obj, prop, val) {
			if (prop === 'prevObject' && (val === undefined || val instanceof TokenCollection)) {
				obj[prop] = val;
				return true;
			}
			return false;
		},
	});
};
/* eslint-disable func-names */
$.hasData = /** @param {Token} element */ function hasData(element) {
	if (!(element instanceof Token)) {
		typeError(this, 'hasData', 'Token');
	}
	return this.dataStore.has(element);
};
$.data = /** @type {function(Token, string, any): any} */ function data(element, key, value) {
	if (!(element instanceof Token)) {
		typeError(this, 'data', 'Token');
	} else if (key === undefined) {
		return this.dataStore.get(element);
	} else if (typeof key !== 'string') {
		typeError(this, 'data', 'String');
	} else if (value === undefined) {
		return this.dataStore.get(element)?.[key];
	} else if (!this.dataStore.has(element)) {
		this.dataStore.set(element, {});
	}
	this.dataStore.get(element)[key] = value;
	return value;
};
$.removeData = /** @type {function(Token, string): void} */ function removeData(element, name) {
	if (!(element instanceof Token)) {
		typeError(this, 'removeData', 'Token');
	} else if (name === undefined) {
		this.dataStore.delete(element);
	} else if (typeof name !== 'string') {
		typeError(this, 'removeData', 'String');
	} else if (this.dataStore.has(element)) {
		const data = this.dataStore.get(element);
		delete data[name];
	}
};
Object.defineProperty($, 'dataStore', {value: dataStore});
Object.defineProperty($, 'TokenCollection', {value: TokenCollection});
Object.defineProperty($, 'reload', {
	value() {
		delete require.cache[__filename];
		const $$ = require('.');
		return $$;
	},
});

module.exports = $;
