'use strict';

const {typeError, externalUse, debugOnly} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..');

class AstNode {
	/** @type {(string|AstNode)[]} */ childNodes = [];
	/** @type {AstNode} */ parentNode;

	get firstChild() {
		return this.childNodes[0];
	}
	get lastChild() {
		return this.childNodes.at(-1);
	}
	get nextSibling() {
		const childNodes = this.parentNode?.childNodes;
		return childNodes?.[childNodes?.indexOf(this) + 1];
	}
	get previousSibling() {
		const childNodes = this.parentNode?.childNodes;
		return childNodes?.[childNodes?.indexOf(this) - 1];
	}

	static isNode(node) {
		return typeof node === 'string' || node instanceof AstNode;
	}

	/** @param {string} key */
	seal(key, enumerable = false) {
		Object.defineProperty(this, key, {enumerable, writable: false});
		return this;
	}

	constructor() {
		this.seal('parentNode').seal('childNodes', true);
		Object.freeze(this.childNodes);
	}

	/** @param {PropertyKey} key */
	hasAttribute(key) {
		if (!['string', 'number', 'symbol'].includes(typeof key)) {
			typeError('String', 'Number', 'Symbol');
		}
		return key in this;
	}

	/**
	 * 除非用于私有属性，否则总是返回字符串
	 * @param {PropertyKey} key
	 */
	getAttribute(key) {
		return this.hasAttribute(key) ? String(this[key]) : undefined;
	}

	getAttributeNames() {
		const names = Object.getOwnPropertyNames(this);
		return names.filter(name => typeof this[name] !== 'function');
	}

	hasAttributes() {
		return this.getAttributeNames().length > 0;
	}

	/** @param {PropertyKey} key */
	setAttribute(key, value) {
		if (this.hasAttribute(key)) {
			const descriptor = Object.getOwnPropertyDescriptor(this, key);
			if (!descriptor || !descriptor.writable && externalUse('setAttribute')) {
				throw new RangeError(`禁止手动指定 ${key} 属性！`);
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
			const {writable} = Object.getOwnPropertyDescriptor(this, key);
			if (!writable) {
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
			typeError('Boolean');
		} else if (this.hasAttribute(key) && typeof this[key] !== 'boolean') {
			throw new RangeError(`${key} 属性的值不为 Boolean！`);
		}
		this.setAttribute(key, force === true || force === undefined && !this[key]);
	}

	toString(separator = '') {
		return this.childNodes.map(String).join(separator);
	}

	/** @returns {string} */
	text(separator = '') {
		return this.childNodes.map(node => typeof node === 'string' ? node : node.text()).join(separator);
	}

	hasChildNodes() {
		return this.childNodes.length > 0;
	}

	/**
	 * 是自身或子孙节点
	 * @param {AstNode} node
	 * @returns {boolean}
	 */
	contains(node) {
		if (!(node instanceof AstNode)) {
			typeError('AstNode');
		}
		return node === this || this.childNodes.some(child => child instanceof AstNode && child.contains(node));
	}

	/** @param {string|AstNode} node */
	verifyChild(node) {
		if (!Parser.debugging && externalUse('verifyChild')) {
			debugOnly(this.constructor, 'verifyChild');
		} else if (!AstNode.isNode(node)) {
			typeError('String', 'AstNode');
		}
		return typeof node === 'string' || !node.contains(this);
	}

	/** @param {number} i */
	removeAt(i) {
		if (typeof i !== 'number') {
			typeError('Number');
		} else if (!Number.isInteger(i) || i < 0 || i >= this.childNodes.length) {
			throw new RangeError(`不存在第 ${i} 个子节点！`);
		}
		const childNodes = [...this.childNodes],
			[node] = childNodes.splice(i, 1);
		if (node instanceof AstNode) {
			node.setAttribute('parentNode');
		}
		this.setAttribute('childNodes', childNodes);
		return node;
	}

	/** @param {string|AstNode} node */
	#getChildIndex(node) {
		if (!AstNode.isNode(node)) {
			typeError('String', 'AstNode');
		}
		const {childNodes} = this,
			i = childNodes.indexOf(node);
		if (i >= 0 && typeof node === 'string' && childNodes.lastIndexOf(node) > i) {
			throw new RangeError(`重复的纯文本节点 ${node.replaceAll('\n', '\\n')}！`);
		}
		return i;
	}

	/**
	 * @template {string|AstNode} T
	 * @param {T} node
	 */
	removeChild(node) {
		const i = this.#getChildIndex(node);
		if (i === -1) {
			Parser.error('找不到子节点！', node);
			throw new RangeError('找不到子节点！');
		}
		this.removeAt(i);
		return node;
	}

	/** @param {string} str */
	setText(str, i = 0) {
		if (typeof str !== 'string') {
			typeError('String');
		} else if (typeof i !== 'number') {
			typeError('Number');
		} else if (!Number.isInteger(i) || i < 0 || i >= this.childNodes.length) {
			throw new RangeError(`不存在第 ${i} 个子节点！`);
		} else if (typeof this.childNodes[i] !== 'string') {
			throw new RangeError(`第 ${i} 个子节点是 ${this.childNodes[i].constructor.name}！`);
		}
		const childNodes = [...this.childNodes];
		childNodes[i] = str;
		this.setAttribute('childNodes', childNodes);
	}

	/**
	 * @template {string|AstNode} T
	 * @param {T} node
	 */
	insertAt(node, i = this.childNodes.length) {
		if (typeof i !== 'number') {
			typeError('Number');
		} else if (!this.verifyChild(node)) {
			Parser.error('插入的子节点非法！', node);
			throw new RangeError('插入的子节点非法！');
		}
		const childNodes = [...this.childNodes],
			j = typeof node === 'string' ? -1 : childNodes.indexOf(node);
		if (j !== -1) {
			childNodes.splice(j, 1);
		}
		i = Math.min(Math.max(i, 0), childNodes.length);
		childNodes.splice(i, 0, node);
		if (node instanceof AstNode) {
			node.parentNode?.removeChild(node);
			node.setAttribute('parentNode', this);
		}
		this.setAttribute('childNodes', childNodes);
		return node;
	}

	/**
	 * @template {string|AstNode} T
	 * @param {T} node
	 */
	appendChild(node) {
		return this.insertAt(node);
	}

	/**
	 * @template {string|AstNode} T
	 * @param {T} child
	 * @param {string|AstNode} reference
	 */
	insertBefore(child, reference) {
		if (reference === undefined) {
			return this.appendChild(child);
		}
		const i = this.#getChildIndex(reference);
		if (i === -1) {
			Parser.error('找不到子节点！', reference);
			throw new RangeError('找不到子节点！');
		}
		return this.insertAt(child, i);
	}

	/**
	 * @template {string|AstNode} T
	 * @param {string|AstNode} newChild
	 * @param {T} oldChild
	 */
	replaceChild(newChild, oldChild) {
		const i = this.#getChildIndex(oldChild);
		this.removeAt(i);
		this.insertAt(newChild, i);
		return oldChild;
	}

	normalize() {
		const childNodes = [...this.childNodes];
		for (const [i, text] of [...childNodes.entries()].reverse()) {
			if (text === '') {
				childNodes.splice(i, 1);
			} else if (typeof text === 'string' && typeof childNodes[i - 1] === 'string') {
				childNodes[i - 1] += text;
				childNodes.splice(i, 1);
			}
		}
		this.setAttribute('childNodes', childNodes);
	}

	getRootNode() {
		let {parentNode} = this,
			node;
		while (parentNode) {
			node = parentNode;
			({parentNode} = node);
		}
		return node ?? this;
	}
}

Parser.classes.AstNode = __filename;
module.exports = AstNode;
