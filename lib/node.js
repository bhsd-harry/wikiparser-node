'use strict';

const {typeError, externalUse} = require('../util/debug'),
	{text, noWrap} = require('../util/string'),
	assert = require('assert/strict'),
	/** @type {Parser} */ Parser = require('..');

class AstNode {
	/** @type {(string|this)[]} */ childNodes = [];
	/** @type {this} */ #parentNode;
	/** @type {string[]} */ #optional = [];

	get firstChild() {
		return this.childNodes[0];
	}
	get lastChild() {
		return this.childNodes.at(-1);
	}
	get parentNode() {
		return this.#parentNode;
	}
	/** @complexity `n` */
	get nextSibling() {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes?.[childNodes?.indexOf(this) + 1];
	}
	/** @complexity `n` */
	get previousSibling() {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes?.[childNodes?.indexOf(this) - 1];
	}

	debugOnly(method = 'debugOnly') {
		throw new Error(`${this.constructor.name}.${method} 方法仅用于代码调试！`);
	}

	/**
	 * @param {string} method
	 * @param  {...string} types
	 */
	typeError(method, ...types) {
		return typeError(this.constructor, method, ...types);
	}

	/** @param {string|string[]} keys */
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

	/** @param {this} node */
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

	/** @param {PropertyKey} key */
	hasAttribute(key) {
		if (!['string', 'number', 'symbol'].includes(typeof key)) {
			this.typeError('hasAttribute', 'String', 'Number', 'Symbol');
		}
		return key in this;
	}

	/**
	 * 除非用于私有属性，否则总是返回字符串
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'optional') {
			return [...this.#optional];
		}
		return this.hasAttribute(key) ? String(this[key]) : undefined;
	}

	getAttributeNames() {
		const names = Object.getOwnPropertyNames(this);
		return names.filter(name => typeof this[name] !== 'function');
	}

	hasAttributes() {
		return this.getAttributeNames().length > 0;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
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

	/** @param {PropertyKey} key */
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
	 * @param {PropertyKey} name
	 * @param {boolean|undefined} force
	 */
	toggleAttribute(key, force) {
		if (force !== undefined && typeof force !== 'boolean') {
			this.typeError('toggleAttribute', 'Boolean');
		} else if (this.hasAttribute(key) && typeof this[key] !== 'boolean') {
			throw new RangeError(`${key} 属性的值不为 Boolean！`);
		}
		this.setAttribute(key, force === true || force === undefined && !this[key]);
	}

	/** @complexity `n` */
	toString(separator = '') {
		return this.childNodes.map(String).join(separator);
	}

	/**
	 * 可见部分
	 * @returns {string}
	 * @complexity `n`
	 */
	text(separator = '') {
		return text(this.childNodes, separator);
	}

	hasChildNodes() {
		return this.childNodes.length > 0;
	}

	/**
	 * 是自身或子孙节点
	 * @param {this} node
	 * @returns {boolean}
	 * @complexity `n`
	 */
	contains(node) {
		if (!(node instanceof AstNode)) {
			this.typeError('contains', 'Token');
		}
		return node === this || this.childNodes.some(child => child instanceof AstNode && child.contains(node));
	}

	/** @param {number} i */
	verifyChild(i, addition = 0) {
		if (!Parser.debugging && externalUse('verifyChild')) {
			this.debugOnly('verifyChild');
		} else if (typeof i !== 'number') {
			this.typeError('verifyChild', 'Number');
		}
		const {length} = this.childNodes;
		if (i < -length || i >= length + addition || !Number.isInteger(i)) {
			throw new RangeError(`不存在第 ${i} 个子节点！`);
		}
	}

	/** @param {number} i */
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
	 * @param {string|this} node
	 * @complexity `n`
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
	 * @template {string|this} T
	 * @param {T} node
	 * @complexity `n`
	 */
	removeChild(node) {
		this.removeAt(this.#getChildIndex(node));
		return node;
	}

	/**
	 * @template {string|this} T
	 * @param {T} node
	 * @complexity `n`
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
			if (j !== -1) {
				childNodes.splice(j, 1);
			} else {
				node.parentNode?.removeChild(node);
				node.setAttribute('parentNode', this);
			}
		}
		childNodes.splice(i, 0, node);
		this.setAttribute('childNodes', childNodes);
		return node;
	}

	/**
	 * @template {string|this} T
	 * @param {T} node
	 * @complexity `n`
	 */
	appendChild(node) {
		return this.insertAt(node);
	}

	/**
	 * @template {string|this} T
	 * @param {T} child
	 * @param {string|this} reference
	 * @complexity `n`
	 */
	insertBefore(child, reference) {
		if (reference === undefined) {
			return this.appendChild(child);
		}
		return this.insertAt(child, this.#getChildIndex(reference));
	}

	/**
	 * @template {string|this} T
	 * @param {string|this} newChild
	 * @param {T} oldChild
	 * @complexity `n`
	 */
	replaceChild(newChild, oldChild) {
		const i = this.#getChildIndex(oldChild);
		this.removeAt(i);
		this.insertAt(newChild, i);
		return oldChild;
	}

	/** @param {string} str */
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
	 * @param {number} i
	 * @param {number} offset
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

	/** @complexity `n` */
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
