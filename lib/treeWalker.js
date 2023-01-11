'use strict';
/* eslint-disable prefer-destructuring, unicorn/consistent-destructuring */
const Token = require('../src'),
	Parser = require('..');

/** 节点遍历 */
class TreeWalker {
	root;
	whatToShow;
	filter;
	container;
	index;

	/**
	 * @param {Token} root 根节点
	 * @param {'all'|'element'|'comment'|'text'} whatToShow 筛选原则
	 * @param {(node: Token|string) => 'accept'|'reject'|'skip'} filter 过滤callback
	 * @throws `TypeError` 根部不是节点或`whatToShow`不在规定的取值范围内
	 */
	constructor(root, whatToShow = 'all', filter = () => 'accept') {
		if (!(root instanceof Token)) {
			throw new TypeError('TreeWalker的根部需要是一个节点！');
		} else if (!['all', 'element', 'comment', 'text'].includes(whatToShow)) {
			throw new RangeError('whatToShow参数请在"all"、"element"、"comment"和"text"中取值！');
		}
		this.root = root;
		this.container = root;
		this.index = -1;
		this.whatToShow = whatToShow;
		this.filter = filter;
		Object.defineProperties(this, {
			root: {writable: false, configurable: false},
			whatToShow: {writable: false, configurable: false},
			filter: {writable: false, configurable: false, enumerable: false},
		});
	}

	/** 当前节点 */
	get currentNode() {
		return this.index === -1 ? this.root : this.container.childNodes[this.index];
	}

	/**
	 * 是否符合whatToShow
	 * @param {Token|string} node 待检查节点
	 */
	isVisible(node) {
		const {whatToShow} = this,
			isText = typeof node === 'string';
		return whatToShow === 'all'
			|| isText && whatToShow === 'text'
			|| !isText && whatToShow === 'element'
			|| !isText && whatToShow === 'comment' && ['comment', 'include', 'noinclude'].includes(node.type);
	}

	/**
	 * 是否跳过该节点及其后代
	 * @param {Token} node 待检查节点
	 * @throws `Error` filter没有返回规定的取值
	 */
	applyFilter(node) {
		const result = this.filter(node);
		if (result === 'accept' || result === 'skip' || result === 'reject') {
			return result;
		}
		Parser.error('filter的返回值不是"accept"、"reject"或"skip"之一！', result);
		throw new Error('filter的返回值不是"accept"、"reject"或"skip"之一！');
	}

	/** 最近的可见祖先 */
	parentNode() {
		if (this.index === -1) {
			return undefined;
		}
		let parentNode = this.container;
		while (this.root.contains(parentNode)
			&& !(this.isVisible(parentNode) && this.applyFilter(parentNode) === 'accept')
		) {
			({parentNode} = parentNode);
		}
		if (this.root.contains(parentNode)) {
			this.container = parentNode === this.root ? parentNode : parentNode.parentNode;
			this.index = parentNode === this.root ? -1 : this.container.childNodes.indexOf(parentNode);
			return parentNode;
		}
		return undefined;
	}

	/** 第一个可见子节点 */
	firstChild() {
		const {currentNode} = this;
		if (typeof currentNode === 'string') {
			return undefined;
		}
		let node = currentNode,
			{firstChild, childNodes, parentNode} = node,
			i = 0,
			result = this.applyFilter(firstChild);
		while (!(this.isVisible(firstChild) && result === 'accept')) {
			if (result !== 'reject' && typeof firstChild !== 'string') {
				node = firstChild;
				({firstChild, childNodes} = node);
				i = 0;
				result = this.applyFilter(firstChild);
				continue;
			}
			firstChild = childNodes[++i];
			while (i === childNodes.length && currentNode.contains(node) && currentNode !== node) {
				({parentNode, nextSibling: firstChild} = node);
				({childNodes} = parentNode);
				i = childNodes.indexOf(node) + 1;
				node = parentNode;
			}
			if (currentNode === node) {
				return undefined;
			}
			result = this.applyFilter(firstChild);
			continue;
		}
		this.container = currentNode;
		this.index = i;
		return firstChild;
	}

	/** 最后一个可见子节点 */
	lastChild() {
		const {currentNode} = this;
		if (typeof currentNode === 'string') {
			return undefined;
		}
		let node = currentNode,
			{lastChild, childNodes, parentNode} = node,
			i = childNodes.length - 1,
			result = this.applyFilter(lastChild);
		while (!(this.isVisible(lastChild) && result === 'accept')) {
			if (result !== 'reject' && typeof lastChild !== 'string') {
				node = lastChild;
				({lastChild, childNodes} = node);
				i = childNodes.length - 1;
				result = this.applyFilter(lastChild);
				continue;
			}
			lastChild = childNodes[--i];
			while (i === -1 && currentNode.contains(node) && currentNode !== node) {
				({parentNode, previousSibling: lastChild} = node);
				({childNodes} = parentNode);
				i = childNodes.indexOf(node) - 1;
				node = parentNode;
			}
			if (currentNode === node) {
				return undefined;
			}
			result = this.applyFilter(lastChild);
			continue;
		}
		this.container = currentNode;
		this.index = i;
		return lastChild;
	}

	/** 前一个可见兄弟 */
	previousSibling() {
		if (this.index === -1) {
			return undefined;
		}
		let {currentNode} = this,
			parentNode = this.container,
			{previousSibling} = currentNode;
		if (previousSibling === undefined) {
			return undefined;
		}
		let {childNodes} = parentNode,
			i = this.index - 1,
			result = this.applyFilter(previousSibling);
		while (!(this.isVisible(previousSibling) && result === 'accept')) {
			if (result !== 'reject' && typeof previousSibling !== 'string') {
				parentNode = previousSibling;
				({lastChild: previousSibling, childNodes} = parentNode);
				i = childNodes.length - 1;
				result = this.applyFilter(previousSibling);
				continue;
			}
			previousSibling = childNodes[--i];
			while (i === -1 && this.container.contains(parentNode) && this.container !== parentNode) {
				currentNode = parentNode;
				({parentNode, previousSibling} = currentNode);
				({childNodes} = parentNode);
				i = childNodes.indexOf(currentNode) - 1;
			}
			if (this.container === parentNode) {
				return undefined;
			}
			result = this.applyFilter(previousSibling);
			continue;
		}
		this.container = parentNode;
		this.index = i;
		return previousSibling;
	}

	/** 下一个可见兄弟 */
	nextSibling() {
		if (this.index === -1) {
			return undefined;
		}
		let {currentNode} = this,
			parentNode = this.container,
			{nextSibling} = currentNode;
		if (nextSibling === undefined) {
			return undefined;
		}
		let {childNodes} = parentNode,
			i = this.index + 1,
			result = this.applyFilter(nextSibling);
		while (!(this.isVisible(nextSibling) && result === 'accept')) {
			if (result !== 'reject' && typeof nextSibling !== 'string') {
				parentNode = nextSibling;
				({firstChild: nextSibling, childNodes} = parentNode);
				i = 0;
				result = this.applyFilter(nextSibling);
				continue;
			}
			nextSibling = childNodes[++i];
			while (i === childNodes.length && this.container.contains(parentNode) && this.container !== parentNode) {
				currentNode = parentNode;
				({parentNode, nextSibling} = currentNode);
				({childNodes} = parentNode);
				i = childNodes.indexOf(currentNode) + 1;
			}
			if (this.container === parentNode) {
				return undefined;
			}
			result = this.applyFilter(nextSibling);
			continue;
		}
		this.container = parentNode;
		this.index = i;
		return nextSibling;
	}

	/** 前一个可见节点 */
	previousNode() {
		if (this.index === -1) {
			return undefined;
		}
		const currentContainer = this.container,
			index = this.index;
		let container = currentContainer,
			node = this.previousSibling();
		while (node === undefined && this.root.contains(this.container) && this.root !== this.container) {
			this.container = this.container.parentNode;
			this.index = this.container.childNodes.indexOf(container);
			container = this.container;
			node = this.previousSibling();
		}
		if (node === undefined) {
			this.container = currentContainer;
			this.index = index;
		}
		return node;
	}

	/** 下一个可见节点 */
	nextNode() {
		const currentContainer = this.container,
			index = this.index;
		let container = currentContainer,
			node = this.firstChild();
		if (node === undefined) {
			node = this.nextSibling();
		}
		while (node === undefined && this.root.contains(this.container) && this.root !== this.container) {
			this.container = this.container.parentNode;
			this.index = this.container.childNodes.indexOf(container);
			container = this.container;
			node = this.nextSibling();
		}
		if (node === undefined) {
			this.container = currentContainer;
			this.index = index;
		}
		return node;
	}
}

Parser.classes.TreeWalker = __filename;
module.exports = TreeWalker;
