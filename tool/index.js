'use strict';

/**
 * @template T
 * @template S
 * @typedef {import('../typings/tool').CollectionCallback<T, S>} CollectionCallback
 */
/** @typedef {import('../typings/event').AstListener} AstListener */

const {typeError} = require('../util/debug'),
	{text} = require('../util/string'),
	{isPlainObject} = require('../util/base'),
	Parser = require('..'),
	AstNode = require('../lib/node'),
	Token = require('../src'),
	AttributesToken = require('../src/attributes');

const /** @type {WeakMap<Token, Record<string, *>>} */ cache = new WeakMap();

/** Token集合 */
class TokenCollection {
	/** @type {AstNode[]} */ array = [];
	/** @type {Set<Token>} */ #roots = new Set();
	/** @type {TokenCollection} */ prevObject;

	/**
	 * 生成匹配函数
	 * @param {string} method
	 * @param {string|AstNode|Iterable<AstNode>} selector
	 * @returns {(token: AstNode) => boolean}
	 */
	static #matchesGenerator = (method, selector) => {
		if (selector === undefined || typeof selector === 'string') {
			return token => token instanceof Token && token.matches(selector);
		} else if (selector?.[Symbol.iterator]) {
			return token => new WeakSet(selector).has(token);
		}
		return selector instanceof AstNode
			? token => token === selector
			: typeError(TokenCollection, method, 'String', 'AstNode', 'Iterable');
	};

	/** @ignore */
	[Symbol.iterator]() {
		return this.array[Symbol.iterator]();
	}

	/** 数组长度 */
	get length() {
		return this.array.length;
	}

	/** 数组长度 */
	size() {
		return this.array.length;
	}

	/**
	 * 筛选Token节点
	 * @returns {Token[]}
	 */
	get #tokens() {
		return this.array.filter(ele => ele instanceof Token);
	}

	/**
	 * 第一个Token节点
	 * @returns {Token}
	 */
	get #firstToken() {
		return this.array.find(ele => ele instanceof Token);
	}

	/**
	 * @param {Iterable<AstNode>} arr 节点数组
	 * @param {TokenCollection} prevObject 前身
	 */
	constructor(arr, prevObject) {
		if (prevObject && !(prevObject instanceof TokenCollection)) {
			this.typeError('constructor', 'TokenCollection');
		}
		for (const token of arr) {
			if (token === undefined) {
				continue;
			} else if (!(token instanceof AstNode)) {
				this.typeError('constructor', 'AstNode');
			} else if (!this.array.includes(token)) {
				this.#roots.add(token.getRootNode());
				this.array.push(token);
			}
		}
		this.prevObject = prevObject;
		this.#sort();
		Object.defineProperties(this, {
			array: {writable: false, configurable: false},
			prevObject: {enumerable: prevObject, writable: false, configurable: false},
		});
		Object.freeze(this.array);
	}

	/**
	 * 抛出TypeError
	 * @param {string} method
	 * @param  {...string} types 可接受的参数类型
	 */
	typeError(method, ...types) {
		return typeError(this.constructor, method, ...types);
	}

	/** 节点排序 */
	#sort() {
		const rootArray = [...this.#roots];
		this.array.sort(/** @type {(a: AstNode, b: AstNode) => boolean} */ (a, b) => {
			const aRoot = a.getRootNode(),
				bRoot = b.getRootNode();
			return aRoot === bRoot ? a.compareDocumentPosition(b) : rootArray.indexOf(aRoot) - rootArray.indexOf(bRoot);
		});
	}

	/** 转换为数组 */
	toArray() {
		return [...this];
	}

	/**
	 * 提取第n个元素
	 * @template {unknown} T
	 * @param {T} n 序号
	 * @returns {T extends number ? AstNode : AstNode[]}
	 */
	get(n) {
		if (Number.isInteger(n)) {
			return this.array.at(n);
		}
		return n === undefined ? this.toArray() : this.typeError('get', 'Number');
	}

	/**
	 * 循环
	 * @param {CollectionCallback<void, AstNode>} callback
	 */
	each(callback) {
		for (let i = 0; i < this.length; i++) {
			const ele = this.array[i];
			callback.call(ele, i, ele);
		}
		return this;
	}

	/**
	 * map方法
	 * @param {CollectionCallback<*, AstNode>} callback
	 */
	map(callback) {
		const arr = this.array.map((ele, i) => callback.call(ele, i, ele));
		try {
			return new TokenCollection(arr, this);
		} catch {
			return arr;
		}
	}

	/**
	 * 子序列
	 * @param {number} start 起点
	 * @param {number} end 终点
	 */
	slice(start, end) {
		return new TokenCollection(this.array.slice(start, end), this);
	}

	/** 第一个元素 */
	first() {
		return this.slice(0, 1);
	}

	/** 最后一个元素 */
	last() {
		return this.slice(-1);
	}

	/**
	 * 任一元素
	 * @param {number} i 序号
	 */
	eq(i) {
		return this.slice(i, i === -1 ? undefined : i + 1);
	}

	/** 使用空字符串join */
	toString() {
		return this.array.map(String).join('');
	}

	/**
	 * 输出有效部分或设置文本
	 * @template {unknown} T
	 * @param {T} str 新文本
	 * @returns {T extends string|CollectionCallback<string, string> ? this : string}
	 */
	text(str) {
		const /** @type {CollectionCallback<string, string> */ callback = typeof str === 'function' ? str : () => str;
		if (typeof str === 'string' || typeof str === 'function') {
			for (let i = 0; i < this.length; i++) {
				const ele = this.array[i];
				if (ele instanceof Token) {
					try {
						ele.replaceChildren(callback.call(ele, i, ele.text()));
					} catch {}
				}
			}
			return this;
		}
		return str === undefined ? text(this.toArray()) : this.typeError('text', 'String', 'Function');
	}

	/**
	 * 判断是否存在元素满足选择器
	 * @param {string|AstNode|Iterable<AstNode>|CollectionCallback<boolean, AstNode>} selector
	 */
	is(selector) {
		return typeof selector === 'function'
			? this.array.some((ele, i) => selector.call(ele, i, ele))
			: this.array.some(TokenCollection.#matchesGenerator('is', selector));
	}

	/**
	 * 筛选满足选择器的元素
	 * @param {string|AstNode|Iterable<AstNode>|CollectionCallback<boolean, AstNode>} selector
	 */
	filter(selector) {
		return new TokenCollection(this.array.filter(
			(ele, i) => typeof selector === 'function'
				? selector.call(ele, i, ele)
				: TokenCollection.#matchesGenerator('filter', selector)(ele),
		), this);
	}

	/**
	 * 筛选不满足选择器的元素
	 * @param {string|AstNode|Iterable<AstNode>|CollectionCallback<boolean, AstNode>} selector
	 */
	not(selector) {
		let /** @type {(ele: AstNode, i: number) => boolean} */ callback;
		if (typeof selector === 'function') {
			callback = /** @implements */ (ele, i) => !selector.call(ele, i, ele);
		} else {
			const matches = TokenCollection.#matchesGenerator('not', selector);
			callback = /** @implements */ ele => !matches(ele);
		}
		return new TokenCollection(this.array.filter(callback), this);
	}

	/**
	 * 搜索满足选择器的子节点
	 * @param {string|AstNode|Iterable<AstNode>} selector
	 */
	find(selector) {
		let arr;
		if (selector === undefined || typeof selector === 'string') {
			arr = this.array.flatMap(token => token instanceof Token ? token.querySelectorAll(selector) : []);
		} else if (selector?.[Symbol.iterator]) {
			arr = [...selector].filter(ele => this.array.some(token => token.contains(ele)));
		} else if (selector instanceof AstNode) {
			arr = this.array.some(token => token.contains(selector)) ? [selector] : [];
		} else {
			this.typeError('find', 'String', 'AstNode', 'Iterable');
		}
		return new TokenCollection(arr, this);
	}

	/**
	 * 是否存在满足条件的后代节点
	 * @param {string|AstNode} selector
	 */
	has(selector) {
		if (selector === undefined || typeof selector === 'string') {
			return this.array.some(ele => ele instanceof Token && ele.querySelector(selector));
		}
		return selector instanceof AstNode
			? this.array.some(ele => ele.contains(selector))
			: this.typeError('has', 'String', 'AstNode');
	}

	/**
	 * 最近的祖先
	 * @param {string} selector
	 */
	closest(selector) {
		if (selector === undefined) {
			return new TokenCollection(this.array.map(({parentNode}) => parentNode), this);
		}
		return typeof selector === 'string'
			? new TokenCollection(this.#tokens.map(ele => ele.closest(selector)), this)
			: this.typeError('closest', 'String');
	}

	/** 第一个Token节点在父容器中的序号 */
	index() {
		const {array: [firstNode]} = this;
		if (firstNode) {
			const {parentNode} = firstNode;
			return parentNode ? parentNode.childNodes.indexOf(firstNode) : 0;
		}
		return -1;
	}

	/**
	 * 添加元素
	 * @param {AstNode|Iterable<AstNode>} elements 新增的元素
	 */
	add(elements) {
		return new TokenCollection([...this, ...Symbol.iterator in elements ? elements : [elements]], this);
	}

	/**
	 * 添加prevObject
	 * @param {string} selector
	 */
	addBack(selector) {
		return this.add(selector ? this.prevObject.filter(selector) : this.prevObject);
	}

	/**
	 * 带选择器筛选的map
	 * @param {string} method
	 * @param {(ele: AstNode) => Token} callback
	 * @param {string} selector
	 */
	#map(method, callback, selector) {
		return selector === undefined || typeof selector === 'string'
			? new TokenCollection(this.array.map(callback).filter(ele => ele.matches(selector)), this)
			: this.typeError(method, 'String');
	}

	/**
	 * 带选择器筛选的flatMap
	 * @param {string} method
	 * @param {(ele: AstNode) => Token|Token[]} callback
	 * @param {string} selector
	 */
	#flatMap(method, callback, selector) {
		return selector === undefined || typeof selector === 'string'
			? new TokenCollection(this.array.flatMap(callback).filter(ele => ele.matches(selector)), this)
			: this.typeError(method, 'String');
	}

	/**
	 * 父元素
	 * @param {string} selector
	 */
	parent(selector) {
		return this.#map('parent', ele => ele.parentNode, selector);
	}

	/**
	 * 祖先
	 * @param {string} selector
	 */
	parents(selector) {
		return this.#flatMap('parents', ele => ele.getAncestors(), selector);
	}

	/**
	 * nextElementSibling
	 * @param {string} selector
	 */
	next(selector) {
		return this.#map('next', ele => ele.nextElementSibling, selector);
	}

	/**
	 * previousElementSibling
	 * @param {string} selector
	 */
	prev(selector) {
		return this.#map('prev', ele => ele.previousElementSibling, selector);
	}

	/**
	 * 筛选兄弟
	 * @param {string} method
	 * @param {(i: number) => number} start 起点
	 * @param {(i: number) => number} count 数量
	 * @param {string} selector
	 */
	#siblings(method, start, count, selector) {
		if (selector !== undefined && typeof selector !== 'string') {
			this.typeError(method, 'String');
		}
		return new TokenCollection(this.array.flatMap(ele => {
			const {parentNode} = ele;
			if (!parentNode) {
				return [];
			}
			const {childNodes} = parentNode,
				i = childNodes.indexOf(ele);
			childNodes.splice(start(i), count(i));
			return childNodes;
		}).filter(ele => ele instanceof Token && ele.matches(selector)), this);
	}

	/**
	 * 所有在后的兄弟
	 * @param {string} selector
	 */
	nextAll(selector) {
		return this.#siblings('nextAll', () => 0, i => i + 1, selector);
	}

	/**
	 * 所有在前的兄弟
	 * @param {string} selector
	 */
	prevAll(selector) {
		return this.#siblings('prevAll', i => i, () => Infinity, selector);
	}

	/**
	 * 所有在后的兄弟
	 * @param {string} selector
	 */
	siblings(selector) {
		return this.#siblings('siblings', i => i, () => 1, selector);
	}

	/**
	 * 直到选择器被满足
	 * @param {'parents'|'nextAll'|'prevAll'} method
	 * @param {string|Token|Iterable<Token>} selector
	 * @param {string} filter 额外的筛选选择器
	 */
	#until(method, selector, filter) {
		const originalMethod = `${method.replace(/All$/u, '')}Until`;
		if (filter !== undefined && typeof filter !== 'string') {
			this.typeError(originalMethod, 'String');
		}
		const matches = TokenCollection.#matchesGenerator(originalMethod, selector);
		return new TokenCollection(this.array.flatMap(ele => {
			const /** @type {{array: Token[]}} */ {array} = $(ele)[method](),
				until = array[method === 'nextAll' ? 'findIndex' : 'findLastIndex'](end => matches(end));
			return method === 'nextAll' ? array.slice(0, until) : array.slice(until + 1);
		}).filter(ele => ele.matches(filter)), this);
	}

	/**
	 * 直到选择器被满足的祖先
	 * @param {string|Token|Iterable<Token>} selector
	 * @param {string} filter 额外的筛选选择器
	 */
	parentsUntil(selector, filter) {
		return this.#until('parents', selector, filter);
	}

	/**
	 * 直到选择器被满足的后方兄弟
	 * @param {string|Token|Iterable<Token>} selector
	 * @param {string} filter 额外的筛选选择器
	 */
	nextUntil(selector, filter) {
		return this.#until('nextAll', selector, filter);
	}

	/**
	 * 直到选择器被满足的前方兄弟
	 * @param {string|Token|Iterable<Token>} selector
	 * @param {string} filter 额外的筛选选择器
	 */
	prevUntil(selector, filter) {
		return this.#until('prevAll', selector, filter);
	}

	/**
	 * Token子节点
	 * @param {string} selector
	 */
	children(selector) {
		return selector === undefined || typeof selector === 'string'
			? new TokenCollection(
				this.#tokens.flatMap(({children}) => children).filter(ele => ele.matches(selector)),
				this,
			)
			: this.typeError('children', 'String');
	}

	/** 所有子节点 */
	contents() {
		return new TokenCollection(this.array.flatMap(({childNodes}) => childNodes), this);
	}

	/**
	 * 存取数据
	 * @param {string|Record<string, *>} key 键
	 * @param {*} value 值
	 */
	data(key, value) {
		if (value !== undefined && typeof key !== 'string') {
			this.typeError('data', 'String');
		} else if (value === undefined && !isPlainObject(key)) {
			const data = cache.get(this.#firstToken);
			return key === undefined ? data : data?.[key];
		}
		for (const token of this.#tokens) {
			if (!cache.has(token)) {
				cache.set(token, {});
			}
			const data = cache.get(token);
			if (typeof key === 'string') {
				data[key] = value;
			} else {
				Object.assign(data, key);
			}
		}
		return this;
	}

	/**
	 * 删除数据
	 * @param {string|string[]} name 键
	 */
	removeData(name) {
		if (name !== undefined && typeof name !== 'string' && !Array.isArray(name)) {
			this.typeError('removeData', 'String', 'Array');
		}
		name = typeof name === 'string' ? name.split(/\s/u) : name;
		for (const token of this.#tokens) {
			if (!cache.has(token)) {
				continue;
			} else if (name === undefined) {
				cache.delete(token);
			} else {
				const data = cache.get(token);
				for (const key of name) {
					delete data[key];
				}
			}
		}
		return this;
	}

	/**
	 * 添加事件监听
	 * @param {string|Record<string, AstListener>} events 事件名
	 * @param {string|AstListener} selector
	 * @param {AstListener} handler 事件处理
	 * @param {boolean} once 是否一次性
	 */
	#addEventListener(events, selector, handler, once = false) {
		if (typeof events !== 'string' && !isPlainObject(events)) {
			this.typeError(once ? 'once' : 'on', 'String', 'Object');
		} else if (typeof selector === 'function') {
			handler = selector;
			selector = undefined;
		}
		const eventPair = typeof events === 'string'
			? events.split(/\s/u).map(/** @returns {[string, AstListener]} */ event => [event, handler])
			: Object.entries(events);
		for (const token of this.#tokens) {
			if (token.matches(selector)) {
				for (const [event, listener] of eventPair) {
					token.addEventListener(event, listener, {once});
				}
			}
		}
		return this;
	}

	/**
	 * 添加事件监听
	 * @param {string|Record<string, AstListener>} events 事件名
	 * @param {string|AstListener} selector
	 * @param {AstListener} handler 事件处理
	 */
	on(events, selector, handler) {
		return this.#addEventListener(events, selector, handler);
	}

	/**
	 * 添加一次性事件监听
	 * @param {string|Record<string, AstListener>} events 事件名
	 * @param {string|AstListener} selector
	 * @param {AstListener} handler 事件处理
	 */
	one(events, selector, handler) {
		return this.#addEventListener(events, selector, handler, true);
	}

	/**
	 * 移除事件监听
	 * @param {string|Record<string, AstListener|undefined>|undefined} events 事件名
	 * @param {string|AstListener} selector
	 * @param {AstListener} handler 事件处理
	 */
	off(events, selector, handler) {
		if (events !== undefined && typeof events !== 'string' && !isPlainObject(events)) {
			this.typeError('off', 'String', 'Object');
		} else if (typeof selector === 'function') {
			handler = selector;
			selector = undefined;
		}
		let eventPair;
		if (events) {
			eventPair = typeof events === 'string'
				? events.split(/\s/u).map(/** @returns {[string, AstListener]} */ event => [event, handler])
				: Object.entries(events);
		}
		for (const token of this.#tokens) {
			if (!token.matches(selector)) {
				continue;
			} else if (events === undefined) {
				token.removeAllEventListeners();
			} else {
				for (const [event, listener] of eventPair) {
					if (listener === undefined) {
						token.removeAllEventListeners(event);
					} else if (typeof listener === 'function') {
						token.removeEventListener(event, listener);
					} else {
						this.typeError('off', 'String', 'Function');
					}
				}
			}
		}
		return this;
	}

	/**
	 * 触发事件
	 * @param {string|Event} event 事件名
	 * @param {*} data 事件数据
	 */
	trigger(event, data) {
		for (const token of this) {
			const e = typeof event === 'string' ? new Event(event, {bubbles: true}) : new Event(event.type, event);
			token.dispatchEvent(e, data);
		}
		return this;
	}

	/**
	 * 伪装触发事件
	 * @param {string|Event} event 事件名
	 * @param {*} data 事件数据
	 */
	triggerHandler(event, data) {
		const {array: [firstNode]} = this;
		if (!firstNode) {
			return undefined;
		}
		const e = typeof event === 'string' ? new Event(event) : event;
		let result;
		for (const listener of firstNode.listEventListeners(e.type)) {
			result = listener(e, data);
		}
		return result;
	}

	/**
	 * 插入文档
	 * @param {'append'|'prepend'|'before'|'after'|'replaceChildren'|'replaceWith'} method
	 * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
	 * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
	 */
	#insert(method, content, ...additional) {
		if (typeof content === 'function') {
			for (let i = 0; i < this.length; i++) {
				const token = this.array[i];
				if (token instanceof Token) {
					const result = content.call(token, i, token.toString());
					if (typeof result === 'string' || result instanceof Token) {
						token[method](result);
					} else if (result?.[Symbol.iterator]) {
						token[method](...result);
					} else {
						this.typeError(method, 'String', 'Token');
					}
				}
			}
		} else {
			for (const token of this) {
				if (token instanceof Token) {
					token[method](
						...Symbol.iterator in content ? content : [content],
						...additional.flatMap(ele => Symbol.iterator in ele ? [...ele] : ele),
					);
				}
			}
		}
		return this;
	}

	/**
	 * 在末尾插入
	 * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
	 * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
	 */
	append(content, ...additional) {
		return this.#insert('append', content, ...additional);
	}

	/**
	 * 在开头插入
	 * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
	 * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
	 */
	prepend(content, ...additional) {
		return this.#insert('prepend', content, ...additional);
	}

	/**
	 * 在后方插入
	 * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
	 * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
	 */
	before(content, ...additional) {
		return this.#insert('before', content, ...additional);
	}

	/**
	 * 在前方插入
	 * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
	 * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
	 */
	after(content, ...additional) {
		return this.#insert('after', content, ...additional);
	}

	/**
	 * 替换所有子节点
	 * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
	 * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
	 */
	html(content) {
		if (content === undefined) {
			return this.toString();
		}
		return this.#insert('replaceChildren', content);
	}

	/**
	 * 替换自身
	 * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
	 * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
	 */
	replaceWith(content) {
		return this.#insert('replaceWith', content);
	}

	/**
	 * 移除自身
	 * @param {string} selector
	 */
	remove(selector) {
		this.removeData();
		for (const token of this) {
			if (token instanceof Token && token.matches(selector)) {
				token.remove();
				token.removeAllEventListeners();
			}
		}
		return this;
	}

	/**
	 * 移除自身
	 * @param {string} selector
	 */
	detach(selector) {
		for (const token of this) {
			if (token instanceof Token && token.matches(selector)) {
				token.remove();
			}
		}
		return this;
	}

	/** 清空子节点 */
	empty() {
		for (const token of this.#tokens) {
			token.replaceChildren();
		}
		return this;
	}

	/**
	 * 深拷贝
	 * @param {boolean} withData 是否复制数据
	 */
	clone(withData) {
		return new TokenCollection(this.#tokens.map(ele => {
			const cloned = ele.cloneNode();
			if (withData && cache.has(ele)) {
				cache.set(cloned, structuredClone(cache.get(ele)));
			}
			return cloned;
		}), this);
	}

	/**
	 * 插入到
	 * @param {string} method
	 * @param {'append'|'prepend'|'before'|'after'|'replaceWith'} elementMethod 对应的AstElement方法
	 * @param {Token|Iterable<Token>} target 目标位置
	 */
	#insertAdjacent(method, elementMethod, target) {
		if (target instanceof Token) {
			target[elementMethod](...this);
		} else if (target?.[Symbol.iterator]) {
			for (const token of target) {
				if (token instanceof Token) {
					token[elementMethod](...this);
				}
			}
		} else {
			this.typeError(method, 'Token', 'Iterable');
		}
		return this;
	}

	/**
	 * 插入到末尾
	 * @param {Token|Iterable<Token>} target 目标位置
	 */
	appendTo(target) {
		return this.#insertAdjacent('appendTo', 'append', target);
	}

	/**
	 * 插入到开头
	 * @param {Token|Iterable<Token>} target 目标位置
	 */
	prependTo(target) {
		return this.#insertAdjacent('prependTo', 'prepend', target);
	}

	/**
	 * 插入到前方
	 * @param {Token|Iterable<Token>} target 目标位置
	 */
	insertBefore(target) {
		return this.#insertAdjacent('insertBefore', 'before', target);
	}

	/**
	 * 插入到后方
	 * @param {Token|Iterable<Token>} target 目标位置
	 */
	insertAfter(target) {
		return this.#insertAdjacent('insertAfter', 'after', target);
	}

	/**
	 * 替换全部
	 * @param {Token|Iterable<Token>} target 目标位置
	 */
	replaceAll(target) {
		return this.#insertAdjacent('replaceAll', 'replaceWith', target);
	}

	/**
	 * 获取几何属性
	 * @param {string|string[]} key 属性键
	 */
	css(key) {
		const /** @type {Record<string, number>} */ style = this.#firstToken?.style;
		if (typeof key === 'string') {
			return style?.[key];
		}
		return Array.isArray(key)
			? Object.fromEntries(key.map(k => [k, style?.[k]]))
			: this.typeError('css', 'String', 'Array');
	}

	/**
	 * 查询或修改值
	 * @param {string|boolean|(string|boolean)[]|CollectionCallback<string, string|boolean>} value 值
	 */
	val(value) {
		if (value === undefined) {
			const /** @type {{getValue: () => string|booleand}} */ firstToken = this.#firstToken;
			return firstToken?.getValue && firstToken.getValue();
		}
		let /** @type {(i: number, token: {getValue: () => string|boolean}) => string|boolean} */ getValue;
		if (typeof value === 'string' || typeof value === 'boolean') {
			getValue = /** @implements */ () => value;
		} else if (typeof value === 'function') {
			getValue = /** @implements */ (i, token) => value.call(token, i, token.getValue && token.getValue());
		} else if (Array.isArray(value)) {
			getValue = /** @implements */ i => value[i];
		} else {
			this.typeError('val', 'String', 'Array', 'Function');
		}
		for (let i = 0; i < this.length; i++) {
			const /** @type {{setValue: (value: string|boolean) => void}} */ token = this.array[i];
			if (token instanceof Token && typeof token.setValue === 'function' && token.setValue.length === 1) {
				token.setValue(getValue(i, token));
			}
		}
		return this;
	}

	/**
	 * 查询或修改属性
	 * @param {'getAttr'|'getAttribute'} getter 属性getter
	 * @param {'setAttr'|'setAttribute'} setter 属性setter
	 * @param {string|Record<string, string|boolean>} name 属性名
	 * @param {string|boolean|CollectionCallback<string|boolean, string|boolean>} value 属性值
	 */
	#attr(getter, setter, name, value) {
		if (typeof name === 'string' && value === undefined) {
			const firstToken = this.#firstToken;
			return firstToken?.[getter] && firstToken[getter](name);
		}
		for (let i = 0; i < this.length; i++) {
			const token = this.array[i];
			if (token instanceof Token && token[setter]) {
				if (typeof value === 'function') {
					token[setter](name, value.call(token, i, token[getter] && token[getter](name)));
				} else if (isPlainObject(name)) {
					for (const [k, v] of Object.entries(name)) {
						token[setter](k, v);
					}
				} else {
					token[setter](name, value);
				}
			}
		}
		return this;
	}

	/**
	 * 标签属性
	 * @param {string|Record<string, string|boolean>} name 属性名
	 * @param {string|boolean|CollectionCallback<string|boolean, string|boolean>} value 属性值
	 */
	attr(name, value) {
		return this.#attr('getAttr', 'setAttr', name, value);
	}

	/**
	 * 节点属性
	 * @param {string|Record<string, string|boolean>} name 属性名
	 * @param {string|boolean|CollectionCallback<string|boolean, string|boolean>} value 属性值
	 */
	prop(name, value) {
		return this.#attr('getAttribute', 'setAttribute', name, value);
	}

	/**
	 * 移除属性
	 * @param {'removeAttr'|'removeAttribute'} method
	 * @param {string} name 属性名
	 */
	#removeAttr(method, name) {
		for (const token of this) {
			if (token instanceof Token && token[method]) {
				token[method](name);
			}
		}
		return this;
	}

	/**
	 * 标签属性
	 * @param {string} name 属性名
	 */
	removeAttr(name) {
		return this.#removeAttr('removeAttr', name);
	}

	/**
	 * 节点属性
	 * @param {string} name 属性名
	 */
	removeProp(name) {
		return this.#removeAttr('removeAttribute', name);
	}

	/**
	 * 添加class
	 * @this {TokenCollection & {array: AttributesToken[]}}
	 * @param {string|string[]|CollectionCallback<string|string[], string>} className 类名
	 */
	addClass(className) {
		/** @type {CollectionCallback<string|string[], string>} */
		const callback = typeof className === 'function' ? className : () => className;
		for (let i = 0; i < this.length; i++) {
			const token = this.array[i],
				{classList} = token;
			if (classList) {
				const newClasses = callback.call(token, i, token.className);
				for (const newClass of Array.isArray(newClasses) ? newClasses : [newClasses]) {
					classList.add(newClass);
				}
				token.className = [...classList].join(' ');
			}
		}
		return this;
	}

	/**
	 * 移除class
	 * @this {TokenCollection & {array: AttributesToken[]}}
	 * @param {undefined|string|string[]|CollectionCallback<undefined|string|string[], string>} className 类名
	 */
	removeClass(className) {
		/** @type {CollectionCallback<undefined|string|string[], string>} */
		const callback = typeof className === 'function' ? className : () => className;
		for (let i = 0; i < this.length; i++) {
			const token = this.array[i],
				{classList} = token;
			if (classList) {
				const newClasses = callback.call(token, i, token.className);
				if (newClasses === undefined) {
					classList.clear();
				} else {
					for (const newClass of Array.isArray(newClasses) ? newClasses : [newClasses]) {
						classList.delete(newClass);
					}
				}
				token.className = [...classList].join(' ');
			}
		}
		return this;
	}

	/**
	 * 增减class
	 * @this {TokenCollection & {array: AttributesToken[]}}
	 * @param {string|string[]|CollectionCallback<string|string[], string>} className 类名
	 * @param {boolean} state 是否增删
	 */
	toggleClass(className, state) {
		if (typeof state === 'boolean') {
			return this[state ? 'addClass' : 'removeClass'](className);
		}
		/** @type {CollectionCallback<string|string[], string>} */
		const callback = typeof className === 'function' ? className : () => className;
		for (let i = 0; i < this.length; i++) {
			const token = this.array[i],
				{classList} = token;
			if (classList) {
				const newClasses = callback.call(token, i, token.className);
				for (const newClass of Array.isArray(newClasses) ? new Set(newClasses) : [newClasses]) {
					classList[classList.has(newClass) ? 'delete' : 'add'](newClass);
				}
				token.className = [...classList].join(' ');
			}
		}
		return this;
	}

	/**
	 * 是否带有某class
	 * @this {{array: AttributesToken[]}}
	 * @param {string} className 类名
	 */
	hasClass(className) {
		return this.array.some(token => token.classList?.has(className));
	}

	/**
	 * 全包围
	 * @param {string[]|CollectionCallback<string[], undefined>} wrapper 包裹
	 * @throws `Error` 不是连续的兄弟节点
	 */
	wrapAll(wrapper) {
		if (typeof wrapper !== 'function' && !Array.isArray(wrapper)) {
			this.typeError('wrapAll', 'Array', 'Function');
		}
		const {array} = this,
			[firstNode] = array,
			/** @type {Token} */ ancestor = firstNode?.parentNode,
			error = new Error('wrapAll 的主体应为普通Token的连续子节点！');
		if (ancestor?.constructor !== Token) {
			throw error;
		}
		const {childNodes} = ancestor,
			i = childNodes.indexOf(firstNode),
			j = childNodes.findIndex(node => node.contains(array.at(-1)));
		if (j === -1 || childNodes.slice(i, j + 1).some(node => !array.includes(node))) {
			throw error;
		}
		const [pre, post] = typeof wrapper === 'function' ? wrapper.call(firstNode) : wrapper,
			config = ancestor.getAttribute('config'),
			include = ancestor.getAttribute('include'),
			token = new Token(`${pre}${String(childNodes.slice(i, j + 1))}${post}`, config).parse(undefined, include);
		this.detach();
		(childNodes[i - 1]?.after ?? ancestor.prepend)(...token.childNodes);
		return this;
	}

	/**
	 * 局部包裹
	 * @param {'html'|'replaceWith'} method
	 * @param {string} originalMethod 原方法
	 * @param {string[]|CollectionCallback<string[], undefined>} wrapper 包裹
	 * @returns {this}
	 */
	#wrap(method, originalMethod, wrapper) {
		if (typeof wrapper !== 'function' && !Array.isArray(wrapper)) {
			this.typeError(originalMethod, 'Array', 'Function');
		}

		/**
		 * @implements {CollectionCallback<AstNode|Iterable<AstNode>, string>}
		 * @this {Token}
		 * @param {number} i 序号
		 * @param {string} string 原文本
		 */
		const callback = function(i, string) {
			const [pre, post] = typeof wrapper === 'function' ? wrapper.call(this, i) : wrapper,
				config = this.getAttribute('config'),
				include = this.getAttribute('include');
			return new Token(`${pre}${string}${post}`, config).parse(undefined, include).childNodes;
		};
		return this[method](callback);
	}

	/**
	 * 包裹内部
	 * @param {string[]|CollectionCallback<string[], undefined>} wrapper 包裹
	 */
	wrapInner(wrapper) {
		return this.#wrap('html', 'wrapInner', wrapper);
	}

	/**
	 * 包裹自身
	 * @param {string[]|CollectionCallback<string[], undefined>} wrapper 包裹
	 */
	wrap(wrapper) {
		return this.#wrap('replaceWith', 'wrap', wrapper);
	}

	/** 相对于文档的位置 */
	offset() {
		const offset = this.#firstToken?.getBoundingClientRect();
		return offset && {top: offset.top, left: offset.left};
	}

	/** 相对于父容器的位置 */
	position() {
		const style = this.#firstToken?.style;
		return style && {top: style.top, left: style.left};
	}

	/** 高度 */
	height() {
		return this.#firstToken?.offsetHeight;
	}

	/** 宽度 */
	width() {
		return this.#firstToken?.offsetWidth;
	}

	/** 内部高度 */
	innerHeight() {
		return this.#firstToken?.clientHeight;
	}

	/** 内部宽度 */
	innerWidth() {
		return this.#firstToken?.clientWidth;
	}
}

/**
 * 代替TokenCollection构造器
 * @param {AstNode|Iterable<AstNode>} arr 节点数组
 */
const $ = arr => new TokenCollection(arr instanceof AstNode ? [arr] : arr);
/* eslint-disable func-names */
$.hasData = /** @param {Token} element */ function hasData(element) {
	return element instanceof Token ? cache.has(element) : typeError(this, 'hasData', 'Token');
};
$.data = /** @type {function(Token, string, *): *} */ function data(element, key, value) {
	if (!(element instanceof Token)) {
		typeError(this, 'data', 'Token');
	} else if (key === undefined) {
		return cache.get(element);
	} else if (typeof key !== 'string') {
		typeError(this, 'data', 'String');
	} else if (value === undefined) {
		return cache.get(element)?.[key];
	} else if (!cache.has(element)) {
		cache.set(element, {});
	}
	cache.get(element)[key] = value;
	return value;
};
$.removeData = /** @type {function(Token, string): void} */ function removeData(element, name) {
	if (!(element instanceof Token)) {
		typeError(this, 'removeData', 'Token');
	} else if (name === undefined) {
		cache.delete(element);
	} else if (typeof name !== 'string') {
		typeError(this, 'removeData', 'String');
	} else if (cache.has(element)) {
		const data = cache.get(element);
		delete data[name];
	}
};
/* eslint-enable func-names */
Object.defineProperty($, 'cache', {value: cache, enumerable: false, writable: false, configurable: false});

Parser.tool.$ = __filename;
module.exports = $;
