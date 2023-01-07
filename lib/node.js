'use strict';

const {typeError, externalUse} = require('../util/debug'),
	{text} = require('../util/string'),
	assert = require('assert/strict'),
	EventEmitter = require('events'),
	Parser = require('..');

/** 类似Node */
class AstNode {
	/** @type {string} */ type;
	/** @type {this[]} */ childNodes = [];
	/** @type {this} */ #parentNode;
	/** @type {string[]} */ #optional = [];
	#events = new EventEmitter();

	/**
	 * 检查在某个位置增删子节点是否合法
	 * @param {number} i 增删位置
	 * @param {number} addition 将会插入的子节点个数
	 * @throws `RangeError` 指定位置不存在子节点
	 */
	#verifyChild = (i, addition = 0) => {
		if (typeof i !== 'number') {
			this.typeError('verifyChild', 'Number');
		}
		const {childNodes: {length}} = this;
		if (i < -length || i >= length + addition || !Number.isInteger(i)) {
			throw new RangeError(`不存在第 ${i} 个子节点！`);
		}
	};

	/** 首位子节点 */
	get firstChild() {
		return this.childNodes[0];
	}

	/** 末位子节点 */
	get lastChild() {
		return this.childNodes.at(-1);
	}

	/** 父节点 */
	get parentNode() {
		return this.#parentNode;
	}

	/** 是否具有根节点 */
	get isConnected() {
		return this.getRootNode().type === 'root';
	}

	/** 不是自身的根节点 */
	get ownerDocument() {
		const root = this.getRootNode();
		return root.type === 'root' && root !== this ? root : undefined;
	}

	/**
	 * 后一个兄弟节点
	 * @complexity `n`
	 */
	get nextSibling() {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this) + 1];
	}

	/**
	 * 前一个兄弟节点
	 * @complexity `n`
	 */
	get previousSibling() {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this) - 1];
	}

	/**
	 * 后一个非文本兄弟节点
	 * @complexity `n`
	 * @returns {this}
	 */
	get nextElementSibling() {
		const childNodes = this.#parentNode?.childNodes,
			i = childNodes?.indexOf(this);
		return childNodes?.slice(i + 1)?.find(({type}) => type !== 'text');
	}

	/**
	 * 前一个非文本兄弟节点
	 * @complexity `n`
	 * @returns {this}
	 */
	get previousElementSibling() {
		const childNodes = this.#parentNode?.childNodes,
			i = childNodes?.indexOf(this);
		return childNodes?.slice(0, i)?.findLast(({type}) => type !== 'text');
	}

	/**
	 * 后方是否还有其他节点（不含后代）
	 * @returns {boolean}
	 * @complexity `n`
	 */
	get eof() {
		const {type, parentNode} = this;
		if (type === 'root') {
			return true;
		}
		let {nextSibling} = this;
		while (nextSibling?.type === 'text' && String(nextSibling).trim() === '') {
			({nextSibling} = nextSibling);
		}
		return nextSibling === undefined && parentNode?.eof;
	}

	/**
	 * 标记仅用于代码调试的方法
	 * @param {string} method 方法名称
	 * @throws `Error`
	 */
	debugOnly(method = 'debugOnly') {
		throw new Error(`${this.constructor.name}.${method} 方法仅用于代码调试！`);
	}

	/**
	 * 抛出`TypeError`
	 * @param {string} method 方法名称
	 * @param  {...string} types 可接受的参数类型
	 */
	typeError(method, ...types) {
		return typeError(this.constructor, method, ...types);
	}

	/**
	 * 冻结部分属性
	 * @param {string|string[]} keys 属性键
	 * @param {boolean} permanent 是否永久
	 */
	seal(keys, permanent) {
		if (!Parser.running && !Parser.debugging) {
			this.debugOnly('seal');
		}
		keys = Array.isArray(keys) ? keys : [keys];
		if (!permanent) {
			this.#optional.push(...keys);
		}
		for (const key of keys) {
			Object.defineProperty(this, key, {
				writable: false, enumerable: Boolean(this[key]), configurable: !permanent,
			});
		}
		return this;
	}

	constructor() {
		Object.defineProperty(this, 'childNodes', {writable: false});
		Object.freeze(this.childNodes);
	}

	/**
	 * 是否是全同节点
	 * @param {this} node 待比较的节点
	 * @throws `assert.AssertionError`
	 */
	isEqualNode(node) {
		try {
			assert.deepStrictEqual(this, node);
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				return false;
			}
			throw e;
		}
		return true;
	}

	/**
	 * 是否具有某属性
	 * @param {PropertyKey} key 属性键
	 */
	hasAttribute(key) {
		const type = typeof key;
		return type === 'string' || type === 'number' || type === 'symbol'
			? key in this
			: this.typeError('hasAttribute', 'String', 'Number', 'Symbol');
	}

	/**
	 * 获取属性值。除非用于私有属性，否则总是返回字符串。
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'optional') {
			return [...this.#optional];
		} else if (key === 'verifyChild') {
			return this.#verifyChild;
		}
		return this.hasAttribute(key) ? String(this[key]) : undefined;
	}

	/** 获取所有属性键 */
	getAttributeNames() {
		const names = Object.getOwnPropertyNames(this);
		return names.filter(name => typeof this[name] !== 'function');
	}

	/** 是否具有任意属性 */
	hasAttributes() {
		return this.getAttributeNames().length > 0;
	}

	/**
	 * 设置属性
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
	 * @throws `RangeError` 禁止手动指定的属性
	 */
	setAttribute(key, value) {
		if (key === 'parentNode') {
			if (externalUse('setAttribute')) {
				throw new RangeError(`禁止手动指定 ${key} 属性！`);
			}
			this.#parentNode = value;
		} else if (this.hasAttribute(key)) {
			const descriptor = Object.getOwnPropertyDescriptor(this, key);
			if (!descriptor || !descriptor.writable && externalUse('setAttribute')) {
				throw new RangeError(`禁止手动指定 ${key} 属性！`);
			} else if (this.#optional.includes(key)) {
				descriptor.enumerable = Boolean(value);
			}
			const oldValue = this[key],
				frozen = oldValue !== null && typeof oldValue === 'object' && Object.isFrozen(oldValue);
			Object.defineProperty(this, key, {...descriptor, value});
			if (frozen && value !== null && typeof value === 'object') {
				Object.freeze(value);
			}
		} else {
			this[key] = value;
		}
		return this;
	}

	/**
	 * 移除某属性
	 * @param {PropertyKey} key 属性键
	 * @throws `RangeError` 不可删除的属性
	 */
	removeAttribute(key) {
		if (this.hasAttribute(key)) {
			const descriptor = Object.getOwnPropertyDescriptor(this, key);
			if (!descriptor || !descriptor.writable) {
				throw new RangeError(`属性 ${key} 不可删除！`);
			}
			delete this[key];
		}
	}

	/**
	 * 开关某属性
	 * @param {PropertyKey} key 属性键
	 * @param {boolean|undefined} force 强制开启或关闭
	 * @throws `RangeError` 不为Boolean类型的属性值
	 */
	toggleAttribute(key, force) {
		if (force !== undefined && typeof force !== 'boolean') {
			this.typeError('toggleAttribute', 'Boolean');
		} else if (this.hasAttribute(key) && typeof this[key] !== 'boolean') {
			throw new RangeError(`${key} 属性的值不为 Boolean！`);
		}
		this.setAttribute(key, force === true || force === undefined && !this[key]);
	}

	/**
	 * 可见部分
	 * @param {string} separator 子节点间的连接符
	 * @returns {string}
	 * @complexity `n`
	 */
	text(separator = '') {
		return text(this.childNodes, separator);
	}

	/** 是否具有子节点 */
	hasChildNodes() {
		return this.childNodes.length > 0;
	}

	/**
	 * 是自身或后代节点
	 * @param {this} node 待检测节点
	 * @returns {boolean}
	 * @complexity `n`
	 */
	contains(node) {
		return node instanceof AstNode
			? node === this || this.childNodes.some(child => child.contains(node))
			: this.typeError('contains', 'AstNode');
	}

	/**
	 * 添加事件监听
	 * @param {string|string[]} types 事件类型
	 * @param {AstListener} listener 监听函数
	 * @param {{once: boolean}} options 选项
	 */
	addEventListener(types, listener, options) {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.addEventListener(type, listener, options);
			}
		} else if (typeof types !== 'string' || typeof listener !== 'function') {
			this.typeError('addEventListener', 'String', 'Function');
		} else {
			this.#events[options?.once ? 'once' : 'on'](types, listener);
		}
	}

	/**
	 * 移除事件监听
	 * @param {string|string[]} types 事件类型
	 * @param {AstListener} listener 监听函数
	 */
	removeEventListener(types, listener) {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.removeEventListener(type, listener);
			}
		} else if (typeof types !== 'string' || typeof listener !== 'function') {
			this.typeError('removeEventListener', 'String', 'Function');
		} else {
			this.#events.off(types, listener);
		}
	}

	/**
	 * 移除事件的所有监听
	 * @param {string|string[]} types 事件类型
	 */
	removeAllEventListeners(types) {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.removeAllEventListeners(type);
			}
		} else if (types !== undefined && typeof types !== 'string') {
			this.typeError('removeAllEventListeners', 'String');
		} else {
			this.#events.removeAllListeners(types);
		}
	}

	/**
	 * 列举事件监听
	 * @param {string} type 事件类型
	 * @returns {AstListener[]}
	 */
	listEventListeners(type) {
		return typeof type === 'string' ? this.#events.listeners(type) : this.typeError('listEventListeners', 'String');
	}

	/**
	 * 触发事件
	 * @param {AstEvent} e 事件对象
	 * @param {any} data 事件数据
	 */
	dispatchEvent(e, data) {
		if (!(e instanceof Event)) {
			this.typeError('dispatchEvent', 'Event');
		} else if (!e.target) { // 初始化
			Object.defineProperty(e, 'target', {value: this, enumerable: true});

			/** 终止冒泡 */
			e.stopPropagation = function() {
				Object.defineProperty(this, 'bubbles', {value: false});
			};
		}
		Object.defineProperties(e, { // 每次bubble更新
			prevTarget: {value: e.currentTarget, enumerable: true, configurable: true},
			currentTarget: {value: this, enumerable: true, configurable: true},
		});
		this.#events.emit(e.type, e, data);
		if (e.bubbles && this.parentNode) {
			this.parentNode.dispatchEvent(e, data);
		}
	}

	/**
	 * 移除子节点
	 * @param {number} i 移除位置
	 */
	removeAt(i) {
		this.getAttribute('verifyChild')(i);
		const childNodes = [...this.childNodes],
			[node] = childNodes.splice(i, 1),
			e = new Event('remove', {bubbles: true});
		node.setAttribute('parentNode');
		this.setAttribute('childNodes', childNodes).dispatchEvent(e, {position: i, removed: node});
		return node;
	}

	/**
	 * 获取子节点的位置
	 * @param {this} node 子节点
	 * @complexity `n`
	 * @throws `RangeError` 找不到子节点
	 */
	#getChildIndex(node) {
		const {childNodes} = this,
			i = childNodes.indexOf(node);
		if (i === -1) {
			Parser.error('找不到子节点！', node);
			throw new RangeError('找不到子节点！');
		}
		return i;
	}

	/**
	 * 移除子节点
	 * @template {this} T
	 * @param {T} node 子节点
	 * @complexity `n`
	 */
	removeChild(node) {
		this.removeAt(this.#getChildIndex(node));
		return node;
	}

	/**
	 * 插入子节点
	 * @template {this} T
	 * @param {T} node 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 * @throws `RangeError` 不能插入祖先节点
	 */
	insertAt(node, i = this.childNodes.length) {
		if (!(node instanceof AstNode)) {
			this.typeError('insertAt', 'String', 'AstNode');
		} else if (node.contains(this)) {
			Parser.error('不能插入祖先节点！', node);
			throw new RangeError('不能插入祖先节点！');
		}
		this.getAttribute('verifyChild')(i, 1);
		const childNodes = [...this.childNodes],
			e = new Event('insert', {bubbles: true}),
			j = Parser.running ? -1 : childNodes.indexOf(node);
		if (j === -1) {
			node.parentNode?.removeChild(node);
			node.setAttribute('parentNode', this);
		} else {
			childNodes.splice(j, 1);
		}
		childNodes.splice(i, 0, node);
		this.setAttribute('childNodes', childNodes)
			.dispatchEvent(e, {position: i < 0 ? i + this.childNodes.length - 1 : i, inserted: node});
		return node;
	}

	/**
	 * 在末尾插入子节点
	 * @template {this} T
	 * @param {T} node 插入节点
	 * @complexity `n`
	 */
	appendChild(node) {
		return this.insertAt(node);
	}

	/**
	 * 在指定位置前插入子节点
	 * @template {this} T
	 * @param {T} child 插入节点
	 * @param {this} reference 指定位置处的子节点
	 * @complexity `n`
	 */
	insertBefore(child, reference) {
		return reference === undefined ? this.appendChild(child) : this.insertAt(child, this.#getChildIndex(reference));
	}

	/**
	 * 替换子节点
	 * @template {this} T
	 * @param {this} newChild 新子节点
	 * @param {T} oldChild 原子节点
	 * @complexity `n`
	 */
	replaceChild(newChild, oldChild) {
		const i = this.#getChildIndex(oldChild);
		this.removeAt(i);
		this.insertAt(newChild, i);
		return oldChild;
	}

	/**
	 * 在当前节点前后插入兄弟节点
	 * @param {this[]} nodes 插入节点
	 * @param {number} offset 插入的相对位置
	 * @complexity `n`
	 * @throws `Error` 不存在父节点
	 */
	#insertAdjacent(nodes, offset) {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		const i = parentNode.childNodes.indexOf(this) + offset;
		for (let j = 0; j < nodes.length; j++) {
			parentNode.insertAt(nodes[j], i + j);
		}
	}

	/**
	 * 在后方批量插入兄弟节点
	 * @param {...this} nodes 插入节点
	 * @complexity `n`
	 */
	after(...nodes) {
		this.#insertAdjacent(nodes, 1);
	}

	/**
	 * 在前方批量插入兄弟节点
	 * @param {...this} nodes 插入节点
	 * @complexity `n`
	 */
	before(...nodes) {
		this.#insertAdjacent(nodes, 0);
	}

	/**
	 * 移除当前节点
	 * @complexity `n`
	 * @throws `Error` 不存在父节点
	 */
	remove() {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		parentNode.removeChild(this);
	}

	/**
	 * 将当前节点批量替换为新的节点
	 * @param {...this} nodes 插入节点
	 * @complexity `n`
	 */
	replaceWith(...nodes) {
		this.after(...nodes);
		this.remove();
	}

	/**
	 * 合并相邻的文本子节点
	 * @complexity `n`
	 */
	normalize() {
		const AstText = require('./text');
		const /** @type {AstText[]} */ childNodes = [...this.childNodes];
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const {type, data} = childNodes[i];
			if (data === '') {
				childNodes.splice(i, 1);
			} else if (type === 'text' && childNodes[i - 1]?.type === 'text') {
				childNodes[i - 1].setAttribute('data', childNodes[i - 1].data + data);
				childNodes.splice(i, 1);
			}
		}
		this.setAttribute('childNodes', childNodes);
	}

	/** 获取根节点 */
	getRootNode() {
		let {parentNode} = this;
		while (parentNode?.parentNode) {
			({parentNode} = parentNode);
		}
		return parentNode ?? this;
	}
}

Parser.classes.AstNode = __filename;
module.exports = AstNode;
