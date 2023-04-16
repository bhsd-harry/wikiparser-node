'use strict';

/**
 * @template {string} T
 * @typedef {import('./node').TokenAttribute<T>} TokenAttribute
 */
/** @typedef {import('./text')} AstText */
/** @typedef {import('../src')} Token */

const {text} = require('../util/string');

/** 类似Node */
class AstNode {
	/** @type {string} */ type;
	/** @type {(AstText|Token)[]} */ childNodes = [];
	/** @type {Token} */ #parentNode;

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
	 * @this {this & (AstText|Token)}
	 * @complexity `n`
	 */
	get nextSibling() {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this) + 1];
	}

	/**
	 * 前一个兄弟节点
	 * @this {this & (AstText|Token)}
	 * @complexity `n`
	 */
	get previousSibling() {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this) - 1];
	}

	/**
	 * 是否具有某属性
	 * @param {string} key 属性键
	 */
	hasAttribute(key) {
		return typeof key === 'string' ? key in this : false;
	}

	/**
	 * 获取属性值。除非用于私有属性，否则总是返回字符串。
	 * @template {string} T
	 * @param {T} key 属性键
	 */
	getAttribute(key) {
		return this.hasAttribute(key)
			? /** @type {TokenAttribute<T>} */ (String(this[/** @type {string} */ (key)]))
			: undefined;
	}

	/**
	 * 设置属性
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
	 */
	setAttribute(key, value = undefined) {
		if (key === 'parentNode') {
			this.#parentNode = /** @type {Token} */ (value);
		} else {
			this[/** @type {string} */ (key)] = value;
		}
		return this;
	}

	/**
	 * 可见部分
	 * @param {string} separator 子节点间的连接符
	 * @complexity `n`
	 */
	text(separator = '') {
		return text(this.childNodes, separator);
	}

	/**
	 * 移除子节点
	 * @param {number} i 移除位置
	 */
	removeAt(i) {
		const {childNodes} = this,
			[node] = childNodes.splice(i, 1);
		return node;
	}

	/**
	 * 插入子节点
	 * @this {this & Token}
	 * @template {AstText|Token} T
	 * @param {T} node 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 */
	insertAt(node, i = this.childNodes.length) {
		const {childNodes} = this,
			j = -1;
		if (j === -1) {
			node.setAttribute('parentNode', this);
		}
		childNodes.splice(i, 0, node);
		return node;
	}

	/**
	 * 合并相邻的文本子节点
	 * @complexity `n`
	 */
	normalize() {
		const {childNodes} = this;
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const cur = childNodes[i],
				prev = childNodes[i - 1];
			if (cur.type !== 'text' || this.getGaps(i - 1)) {
				//
			} else if (cur.data === '') {
				childNodes.splice(i, 1);
			} else if (prev?.type === 'text') {
				prev.setAttribute('data', prev.data + cur.data);
				childNodes.splice(i, 1);
			}
		}
	}

	/** 获取根节点 */
	getRootNode() {
		let {parentNode} = this;
		while (parentNode?.parentNode) {
			({parentNode} = parentNode);
		}
		return parentNode ?? this;
	}

	/**
	 * 将字符位置转换为行列号
	 * @param {number} index 字符位置
	 * @complexity `n`
	 */
	posFromIndex(index) {
		const str = String(this);
		if (index >= -str.length && index <= str.length) {
			const lines = str.slice(0, index).split('\n');
			return {top: lines.length - 1, left: lines.at(-1).length};
		}
		return undefined;
	}

	/**
	 * 获取行数和最后一行的列数
	 * @complexity `n`
	 */
	#getDimension() {
		const lines = String(this).split('\n');
		return {height: lines.length, width: lines.at(-1).length};
	}

	/** 第一个子节点前的间距 */
	getPadding() {
		return 0;
	}

	/**
	 * 子节点间距
	 * @param {number} i 子节点序号
	 */
	getGaps(i = 0) { // eslint-disable-line no-unused-vars
		return 0;
	}

	/**
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @template {number} T
	 * @this {this & (T extends number ? Token : AstText|Token)}
	 * @param {T} j 子节点序号
	 * @complexity `n`
	 */
	getRelativeIndex(j = undefined) {
		let /** @type {(AstText|Token)[]} */ childNodes;

		/**
		 * 获取子节点相对于父节点的字符位置，使用前需要先给`childNodes`赋值
		 * @param {number} end 子节点序号
		 * @param {Token} parent 父节点
		 */
		const getIndex = (end, parent) => childNodes.slice(0, end).reduce(
			(acc, cur, i) => acc + String(cur).length + parent.getGaps(i),
			0,
		) + parent.getPadding();
		if (j === undefined) {
			const {parentNode} = this;
			if (parentNode) {
				({childNodes} = parentNode);
				return getIndex(childNodes.indexOf(this), parentNode);
			}
			return 0;
		}
		({childNodes} = this);
		return getIndex(j, this);
	}

	/**
	 * 获取当前节点的绝对位置
	 * @this {this & (AstText|Token)}
	 * @complexity `n`
	 */
	getAbsoluteIndex() {
		const {parentNode} = this;
		return parentNode ? parentNode.getAbsoluteIndex() + this.getRelativeIndex() : 0;
	}

	/**
	 * 行数
	 * @complexity `n`
	 */
	get offsetHeight() {
		return this.#getDimension().height;
	}

	/**
	 * 最后一行的列数
	 * @complexity `n`
	 */
	get offsetWidth() {
		return this.#getDimension().width;
	}
}

module.exports = AstNode;
