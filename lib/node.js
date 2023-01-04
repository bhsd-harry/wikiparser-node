'use strict';

const {typeError, externalUse} = require('../util/debug'),
	{text, noWrap} = require('../util/string'),
	assert = require('assert/strict'),
	Parser = require('..');

/** 类似Node */
class AstNode {
	/**
	 * 全部子节点
	 * @type {(string|this)[]}
	 */
	childNodes = [];
	/** @type {this} */ #parentNode;
	/** @type {string[]} */ #optional = [];

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
	 */
	seal(keys) {
		if (!Parser.running && !Parser.debugging) {
			this.debugOnly('seal');
		}
		keys = Array.isArray(keys) ? keys : [keys];
		this.#optional.push(...keys);
		for (const key of keys) {
			Object.defineProperty(this, key, {writable: false, enumerable: Boolean(this[key])});
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
	 * 是自身或子孙节点
	 * @param {this} node 待检测节点
	 * @returns {boolean}
	 * @complexity `n`
	 */
	contains(node) {
		return node instanceof AstNode
			? node === this || this.childNodes.some(child => child instanceof AstNode && child.contains(node))
			: this.typeError('contains', 'Token');
	}

	/**
	 * 检查在某个位置增删子节点是否合法
	 * @param {number} i 增删位置
	 * @param {number} addition 将会插入的子节点个数
	 * @throws `RangeError` 指定位置不存在子节点
	 */
	verifyChild(i, addition = 0) {
		if (!Parser.debugging && externalUse('verifyChild')) {
			this.debugOnly('verifyChild');
		} else if (typeof i !== 'number') {
			this.typeError('verifyChild', 'Number');
		}
		const {childNodes: {length}} = this;
		if (i < -length || i >= length + addition || !Number.isInteger(i)) {
			throw new RangeError(`不存在第 ${i} 个子节点！`);
		}
	}

	/**
	 * 移除子节点
	 * @param {number} i 移除位置
	 */
	removeAt(i) {
		this.verifyChild(i);
		const childNodes = [...this.childNodes],
			[node] = childNodes.splice(i, 1);
		if (node instanceof AstNode) {
			node.setAttribute('parentNode');
		}
		this.setAttribute('childNodes', childNodes);
		return node;
	}

	/**
	 * 获取子节点的位置
	 * @param {string|this} node 子节点
	 * @complexity `n`
	 * @throws `RangeError` 找不到子节点
	 * @throws `RangeError` 重复的纯文本节点
	 */
	#getChildIndex(node) {
		const {childNodes} = this,
			i = childNodes.indexOf(node);
		if (i === -1) {
			Parser.error('找不到子节点！', node);
			throw new RangeError('找不到子节点！');
		} else if (typeof node === 'string' && childNodes.lastIndexOf(node) > i) {
			throw new RangeError(`重复的纯文本节点 ${noWrap(node)}！`);
		}
		return i;
	}

	/**
	 * 移除子节点
	 * @template {string|this} T
	 * @param {T} node 子节点
	 * @complexity `n`
	 */
	removeChild(node) {
		this.removeAt(this.#getChildIndex(node));
		return node;
	}

	/**
	 * 插入子节点
	 * @template {string|this} T
	 * @param {T} node 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 * @throws `RangeError` 不能插入祖先节点
	 */
	insertAt(node, i = this.childNodes.length) {
		if (typeof node !== 'string' && !(node instanceof AstNode)) {
			this.typeError('insertAt', 'String', 'Token');
		} else if (node instanceof AstNode && node.contains(this)) {
			Parser.error('不能插入祖先节点！', node);
			throw new RangeError('不能插入祖先节点！');
		}
		this.verifyChild(i, 1);
		const childNodes = [...this.childNodes];
		if (node instanceof AstNode) {
			const j = Parser.running ? -1 : childNodes.indexOf(node);
			if (j === -1) {
				node.parentNode?.removeChild(node);
				node.setAttribute('parentNode', this);
			} else {
				childNodes.splice(j, 1);
			}
		}
		childNodes.splice(i, 0, node);
		this.setAttribute('childNodes', childNodes);
		return node;
	}

	/**
	 * 在末尾插入子节点
	 * @template {string|this} T
	 * @param {T} node 插入节点
	 * @complexity `n`
	 */
	appendChild(node) {
		return this.insertAt(node);
	}

	/**
	 * 在指定位置前插入子节点
	 * @template {string|this} T
	 * @param {T} child 插入节点
	 * @param {string|this} reference 指定位置处的子节点
	 * @complexity `n`
	 */
	insertBefore(child, reference) {
		return reference === undefined ? this.appendChild(child) : this.insertAt(child, this.#getChildIndex(reference));
	}

	/**
	 * 替换子节点
	 * @template {string|this} T
	 * @param {string|this} newChild 新子节点
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
	 * 修改文本子节点
	 * @param {string} str 新文本
	 * @param {number} i 子节点位置
	 * @throws `RangeError` 对应位置的子节点不是文本节点
	 */
	setText(str, i = 0) {
		if (typeof str !== 'string') {
			this.typeError('setText', 'String');
		}
		this.verifyChild(i);
		const oldText = this.childNodes.at(i);
		if (typeof oldText !== 'string') {
			throw new RangeError(`第 ${i} 个子节点是 ${oldText.constructor.name}！`);
		}
		const childNodes = [...this.childNodes];
		childNodes.splice(i, 1, str);
		this.setAttribute('childNodes', childNodes);
		return oldText;
	}

	/**
	 * 将文本子节点分裂为两部分
	 * @param {number} i 子节点位置
	 * @param {number} offset 分裂位置
	 * @throws `RangeError` 不是文本节点
	 */
	splitText(i, offset) {
		if (typeof offset !== 'number') {
			this.typeError('splitText', 'Number');
		}
		this.verifyChild(i);
		const oldText = this.childNodes.at(i);
		if (typeof oldText !== 'string') {
			throw new RangeError(`第 ${i} 个子节点是 ${oldText.constructor.name}！`);
		}
		const newText = oldText.slice(offset);
		this.insertAt(newText, i + 1);
		this.setText(oldText.slice(0, offset), i);
		return newText;
	}

	/**
	 * 合并相邻的文本子节点
	 * @complexity `n`
	 */
	normalize() {
		const childNodes = [...this.childNodes];
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const str = childNodes[i];
			if (str === '') {
				childNodes.splice(i, 1);
			} else if (typeof str === 'string' && typeof childNodes[i - 1] === 'string') {
				childNodes[i - 1] += str;
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
