'use strict';

const fs = require('fs'),
	{externalUse} = require('../util/debug'),
	{toCase, noWrap} = require('../util/string'),
	{nth} = require('./ranges'),
	parseSelector = require('../parser/selector'),
	EventEmitter = require('events'),
	AstNode = require('./node'),
	Parser = require('..');

/** 类似HTMLElement */
class AstElement extends AstNode {
	/** @type {string} */ type;
	/** @type {string} */ name;
	#events = new EventEmitter();

	/**
	 * 全部非文本子节点
	 * @complexity `n`
	 */
	get children() {
		const /** @type {this[]} */ children = this.childNodes.filter(ele => typeof ele !== 'string');
		return children;
	}

	/**
	 * 非文本子节点总数
	 * @complexity `n`
	 */
	get childElementCount() {
		return this.children.length;
	}

	/**
	 * 首位非文本子节点
	 * @returns {this}
	 */
	get firstElementChild() {
		return this.childNodes.find(ele => typeof ele !== 'string');
	}

	/**
	 * 末位非文本子节点
	 * @complexity `n`
	 */
	get lastElementChild() {
		return this.children.at(-1);
	}

	/** 父节点 */
	get parentElement() {
		return this.parentNode;
	}

	/** 是否具有根节点 */
	get isConnected() {
		return this.getRootNode().type === 'root';
	}

	/**
	 * 后一个非文本兄弟节点
	 * @complexity `n`
	 */
	get nextElementSibling() {
		const children = this.parentNode?.children;
		return children && children[children.indexOf(this) + 1];
	}

	/**
	 * 前一个非文本兄弟节点
	 * @complexity `n`
	 */
	get previousElementSibling() {
		const children = this.parentNode?.children;
		return children && children[children.indexOf(this) - 1];
	}

	/**
	 * 不可见
	 * @complexity `n`
	 */
	get hidden() {
		return this.text() === '';
	}

	/**
	 * 后一个可见的兄弟节点
	 * @complexity `n`
	 */
	get nextVisibleSibling() {
		let {nextSibling} = this;
		while (nextSibling === '' || nextSibling instanceof AstElement && nextSibling.hidden) {
			({nextSibling} = nextSibling);
		}
		return nextSibling;
	}

	/**
	 * 前一个可见的兄弟节点
	 * @complexity `n`
	 */
	get previousVisibleSibling() {
		let {previousSibling} = this;
		while (previousSibling === '' || previousSibling instanceof AstElement && previousSibling.hidden) {
			({previousSibling} = previousSibling);
		}
		return previousSibling;
	}

	constructor() {
		super();
		this.seal('name');
	}

	/**
	 * 销毁
	 * @complexity `n`
	 * @throws `Error` 不能销毁子节点
	 */
	destroy() {
		if (this.parentNode) {
			throw new Error('不能销毁子节点！');
		}
		for (const element of this.children) {
			element.setAttribute('parentNode');
		}
		Object.setPrototypeOf(this, null);
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
		if (typeof type !== 'string') {
			this.typeError('listEventListeners', 'String');
		}
		return this.#events.listeners(type);
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
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
	 * @throws `RangeError` 禁止手动指定的属性
	 */
	setAttribute(key, value) {
		if (key === 'name' && externalUse('setAttribute')) {
			throw new RangeError(`禁止手动指定 ${key} 属性！`);
		}
		return super.setAttribute(key, value);
	}

	/**
	 * @override
	 * @param {number} i 移除位置
	 */
	removeAt(i) {
		const element = super.removeAt(i),
			e = new Event('remove', {bubbles: true});
		this.dispatchEvent(e, {position: i, removed: element});
		return element;
	}

	/**
	 * @override
	 * @template {string|this} T
	 * @param {T} element 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 */
	insertAt(element, i = this.childNodes.length) {
		super.insertAt(element, i);
		const e = new Event('insert', {bubbles: true});
		this.dispatchEvent(e, {position: i < 0 ? i + this.childNodes.length - 1 : i, inserted: element});
		return element;
	}

	/**
	 * @override
	 * @param {string} str 新文本
	 * @param {number} i 子节点位置
	 */
	setText(str, i = 0) {
		const oldText = super.setText(str, i),
			e = new Event('text', {bubbles: true});
		if (oldText !== str) {
			this.dispatchEvent(e, {position: i, oldText, newText: str});
		}
		return oldText;
	}

	/**
	 * 在末尾批量插入子节点
	 * @param {...string|this} elements 插入节点
	 * @complexity `n`
	 */
	append(...elements) {
		for (const element of elements) {
			this.appendChild(element);
		}
	}

	/**
	 * 在开头批量插入子节点
	 * @param {...string|this} elements 插入节点
	 * @complexity `n`
	 */
	prepend(...elements) {
		for (let i = 0; i < elements.length; i++) {
			this.insertAt(elements[i], i);
		}
	}

	/**
	 * 批量替换子节点
	 * @param {...string|this} elements 新的子节点
	 * @complexity `n`
	 */
	replaceChildren(...elements) {
		for (let i = this.childNodes.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
	}

	/**
	 * 在当前节点前后插入兄弟节点
	 * @param {(string|this)[]} elements 插入节点
	 * @param {number} offset 插入的相对位置
	 * @complexity `n`
	 * @throws `Error` 不存在父节点
	 */
	#insertAdjacent(elements, offset) {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		const i = parentNode.childNodes.indexOf(this) + offset;
		for (let j = 0; j < elements.length; j++) {
			parentNode.insertAt(elements[j], i + j);
		}
	}

	/**
	 * 在后方批量插入兄弟节点
	 * @param {...string|this} elements 插入节点
	 * @complexity `n`
	 */
	after(...elements) {
		this.#insertAdjacent(elements, 1);
	}

	/**
	 * 在前方批量插入兄弟节点
	 * @param {...string|this} elements 插入节点
	 * @complexity `n`
	 */
	before(...elements) {
		this.#insertAdjacent(elements, 0);
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
	 * @param {...string|this} elements 插入节点
	 * @complexity `n`
	 */
	replaceWith(...elements) {
		this.after(...elements);
		this.remove();
	}

	/**
	 * 检查是否符合某条属性规则
	 * @param {string} key 属性键
	 * @param {string|undefined} equal 属性规则运算符，`equal`存在时`val`和`i`也一定存在
	 * @param {string|undefined} val 属性值
	 * @param {string|undefined} i 是否对大小写不敏感
	 * @throws `Error` 禁止外部调用
	 */
	matchesAttr(key, equal, val, i) {
		if (externalUse('matchesAttr')) {
			throw new Error(`禁止外部调用 ${this.constructor.name}.matchesAttr 方法！`);
		} else if (!equal) {
			return this.hasAttribute(key);
		} else if (!this.hasAttribute(key)) {
			return equal === '!=';
		}
		val = toCase(val, i);
		if (equal === '~=') {
			let /** @type {Iterable<string>} */ thisVals = this[key];
			if (typeof thisVals === 'string') {
				thisVals = thisVals.split(/\s/u);
			}
			return Boolean(thisVals?.[Symbol.iterator]) && [...thisVals].some(v => toCase(v, i) === val);
		}
		const thisVal = toCase(this.getAttribute(key), i);
		switch (equal) {
			case '|=':
				return thisVal === val || thisVal.startsWith(`${val}-`);
			case '^=':
				return thisVal.startsWith(val);
			case '$=':
				return thisVal.endsWith(val);
			case '*=':
				return thisVal.includes(val);
			case '!=':
				return thisVal !== val;
			default: // `=`
				return thisVal === val;
		}
	}

	/**
	 * 检查是否符合解析后的选择器，不含节点关系
	 * @param {SelectorArray} step 解析后的选择器
	 * @throws `SyntaxError` 未定义的伪选择器
	 */
	#matches(step) {
		const {parentNode, type, name, childNodes} = this,
			children = parentNode?.children,
			childrenOfType = children?.filter(({type: t}) => t === type),
			siblingsCount = children?.length ?? 1,
			siblingsCountOfType = childrenOfType?.length ?? 1,
			index = (children?.indexOf(this) ?? 0) + 1,
			indexOfType = (childrenOfType?.indexOf(this) ?? 0) + 1,
			lastIndex = siblingsCount - index + 1,
			lastIndexOfType = siblingsCountOfType - indexOfType + 1;
		return step.every(selector => {
			if (typeof selector === 'string') {
				switch (selector) { // 情形1：简单伪选择器、type和name
					case '*':
						return true;
					case ':root':
						return !parentNode;
					case ':first-child':
						return index === 1;
					case ':first-of-type':
						return indexOfType === 1;
					case ':last-child':
						return lastIndex === 1;
					case ':last-of-type':
						return lastIndexOfType === 1;
					case ':only-child':
						return siblingsCount === 1;
					case ':only-of-type':
						return siblingsCountOfType === 1;
					case ':empty':
						return !childNodes.some(Boolean);
					case ':parent':
						return childNodes.some(Boolean);
					case ':header':
						return type === 'heading';
					case ':hidden':
						return this.text() === '';
					case ':visible':
						return this.text() !== '';
					default: {
						const [t, n] = selector.split('#');
						return (!t || t === type || Boolean(Parser.typeAliases[type]?.includes(t)))
							&& (!n || n === name);
					}
				}
			} else if (selector.length === 4) { // 情形2：属性选择器
				return this.matchesAttr(...selector);
			}
			const [s, pseudo] = selector; // 情形3：复杂伪选择器
			switch (pseudo) {
				case 'is':
					return this.matches(s);
				case 'not':
					return !this.matches(s);
				case 'nth-child':
					return nth(s, index);
				case 'nth-of-type':
					return nth(s, indexOfType);
				case 'nth-last-child':
					return nth(s, lastIndex);
				case 'nth-last-of-type':
					return nth(s, lastIndexOfType);
				case 'contains':
					return this.text().includes(s);
				case 'has':
					return Boolean(this.querySelector(s));
				default:
					throw new SyntaxError(`未定义的伪选择器！${pseudo}`);
			}
		});
	}

	/**
	 * 检查是否符合选择器
	 * @param {string|SelectorArray[]} selector
	 * @returns {boolean}
	 * @complexity `n`
	 */
	matches(selector = '') {
		if (typeof selector === 'string') {
			return Parser.run(() => parseSelector(selector).some(condition => this.matches(condition)));
		} else if (!Parser.running) {
			this.typeError('matches', 'String');
		}
		selector = structuredClone(selector);
		const step = selector.pop();
		if (this.#matches(step)) {
			const {parentNode, previousElementSibling} = this;
			switch (selector.at(-1)?.relation) {
				case undefined:
					return true;
				case '>':
					return parentNode?.matches(selector);
				case '+':
					return previousElementSibling?.matches(selector);
				case '~': {
					if (!parentNode) {
						return false;
					}
					const {children} = parentNode,
						i = children.indexOf(this);
					return children.slice(0, i).some(child => child.matches(selector));
				}
				default:
					return this.getAncestors().some(ancestor => ancestor.matches(selector));
			}
		}
		return false;
	}

	/** 获取所有祖先节点 */
	getAncestors() {
		const /** @type {this[]} */ ancestors = [];
		let {parentNode} = this;
		while (parentNode) {
			ancestors.push(parentNode);
			({parentNode} = parentNode);
		}
		return ancestors;
	}

	/**
	 * 比较和另一个节点的相对位置
	 * @param {this} other 待比较的节点
	 * @complexity `n`
	 * @throws `Error` 不在同一个语法树
	 */
	comparePosition(other) {
		if (!(other instanceof AstElement)) {
			this.typeError('comparePosition', 'AstElement');
		} else if (this === other) {
			return 0;
		} else if (this.contains(other)) {
			return -1;
		} else if (other.contains(this)) {
			return 1;
		} else if (this.getRootNode() !== other.getRootNode()) {
			throw new Error('不在同一个语法树！');
		}
		const aAncestors = [...this.getAncestors().reverse(), this],
			bAncestors = [...other.getAncestors().reverse(), other],
			depth = aAncestors.findIndex((ancestor, i) => bAncestors[i] !== ancestor),
			commonAncestor = aAncestors[depth - 1],
			{childNodes} = commonAncestor;
		return childNodes.indexOf(aAncestors[depth]) - childNodes.indexOf(bAncestors[depth]);
	}

	/**
	 * 最近的祖先节点
	 * @param {string} selector
	 */
	closest(selector = '') {
		let {parentNode} = this;
		while (parentNode) {
			if (parentNode.matches(selector)) {
				return parentNode;
			}
			({parentNode} = parentNode);
		}
		return undefined;
	}

	/**
	 * 符合选择器的第一个子孙节点
	 * @param {string} selector
	 * @returns {this|undefined}
	 * @complexity `n`
	 */
	querySelector(selector = '') {
		for (const child of this.children) {
			if (child.matches(selector)) {
				return child;
			}
			const descendant = child.querySelector(selector);
			if (descendant) {
				return descendant;
			}
		}
		return undefined;
	}

	/**
	 * 符合选择器的所有子孙节点
	 * @param {string} selector
	 * @complexity `n`
	 */
	querySelectorAll(selector = '') {
		const /** @type {this[]} */ descendants = [];
		for (const child of this.children) {
			if (child.matches(selector)) {
				descendants.push(child);
			}
			descendants.push(...child.querySelectorAll(selector));
		}
		return descendants;
	}

	/**
	 * 将字符位置转换为行列号
	 * @param {number} index 字符位置
	 * @complexity `n`
	 */
	posFromIndex(index) {
		if (typeof index !== 'number') {
			this.typeError('posFromIndex', 'Number');
		}
		const text = this.toString();
		if (index < -text.length || index >= text.length || !Number.isInteger(index)) {
			return undefined;
		}
		const lines = text.slice(0, index).split('\n');
		return {top: lines.length - 1, left: lines.at(-1).length};
	}

	/**
	 * 将行列号转换为字符位置
	 * @param {number} top 行号
	 * @param {number} left 列号
	 * @complexity `n`
	 */
	indexFromPos(top, left) {
		if (typeof top !== 'number' || typeof left !== 'number') {
			this.typeError('indexFromPos', 'Number');
		} else if (top < 0 || left < 0 || !Number.isInteger(top) || !Number.isInteger(left)) {
			return undefined;
		}
		const lines = this.toString().split('\n');
		if (lines.length < top + 1 || lines[top].length < left) {
			return undefined;
		}
		return lines.slice(0, top).reduce((acc, curLine) => acc + curLine.length + 1, 0) + left;
	}

	/**
	 * 获取行数和最后一行的列数
	 * @complexity `n`
	 */
	#getDimension() {
		const lines = this.toString().split('\n');
		return {height: lines.length, width: lines.at(-1).length};
	}

	/**
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @param {number|undefined} j 子节点序号
	 * @complexity `n`
	 */
	getRelativeIndex(j) {
		if (j !== undefined && typeof j !== 'number') {
			this.typeError('getRelativeIndex', 'Number');
		}
		let /** @type {(string|this)[]} */ childNodes;

		/**
		 * 获取子节点相对于父节点的字符位置，使用前需要先给`childNodes`赋值
		 * @param {number} end 子节点序号
		 * @param {this} parent 父节点
		 * @returns {number}
		 */
		const getIndex = (end, parent) => childNodes.slice(0, end).reduce(
			(acc, cur, i) => acc + String(cur).length + parent.getGaps(i),
			0,
		) + parent.getPadding();
		if (j === undefined) {
			const {parentNode} = this;
			if (!parentNode) {
				return 0;
			}
			({childNodes} = parentNode);
			return getIndex(childNodes.indexOf(this), parentNode);
		}
		this.verifyChild(j, 1);
		({childNodes} = this);
		return getIndex(j, this);
	}

	/**
	 * 获取当前节点的绝对位置
	 * @returns {number}
	 * @complexity `n`
	 */
	getAbsoluteIndex() {
		const {parentNode} = this;
		return parentNode ? parentNode.getAbsoluteIndex() + this.getRelativeIndex() : 0;
	}

	/**
	 * 获取当前节点的相对位置，或其第`j`个子节点的相对位置
	 * @param {number|undefined} j 子节点序号
	 * @complexity `n`
	 */
	#getPosition(j) {
		if (j === undefined) {
			const {parentNode} = this;
			if (!parentNode) {
				return {top: 0, left: 0};
			}
			return parentNode.posFromIndex(this.getRelativeIndex());
		}
		return this.posFromIndex(this.getRelativeIndex(j));
	}

	/**
	 * 获取当前节点的行列位置和大小
	 * @complexity `n`
	 */
	getBoundingClientRect() {
		const root = this.getRootNode();
		return {...this.#getDimension(), ...root.posFromIndex(this.getAbsoluteIndex())};
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

	/**
	 * 行号
	 * @complexity `n`
	 */
	get offsetTop() {
		return this.#getPosition().top;
	}

	/**
	 * 列号
	 * @complexity `n`
	 */
	get offsetLeft() {
		return this.#getPosition().left;
	}

	/** 第一个子节点前的间距 */
	getPadding() {
		return 0;
	}

	/** 子节点间距 */
	getGaps() {
		return 0;
	}

	/**
	 * 位置、大小和padding
	 * @complexity `n`
	 */
	get style() {
		return {...this.#getPosition(), ...this.#getDimension(), padding: this.getPadding()};
	}

	/**
	 * 后方是否还有其他节点（不含子孙节点）
	 * @returns {boolean}
	 * @complexity `n`
	 */
	get eof() {
		const {type, parentNode, nextSibling} = this;
		return type === 'root'
			|| (!nextSibling || typeof nextSibling === 'string' && nextSibling.trim() === '') && parentNode?.eof;
	}

	/**
	 * 输出AST
	 * @template {'markup'|'json'} T
	 * @param {T} format 输出格式
	 * @param {T extends 'markup' ? number : string} depth 输出深度
	 * @returns {T extends 'markup' ? void : Record<string, any>}
	 */
	print(format = 'markup', depth = 0) {
		if (format === 'json') {
			const {childNodes, ...prop} = this,
				json = {
					...prop,
					childNodes: childNodes.map(child => typeof child === 'string' ? child : child.print('json')),
				};
			if (typeof depth === 'string') {
				fs.writeFileSync(
					`${__dirname.slice(0, -3)}printed/${depth}${depth.endsWith('.json') ? '' : '.json'}`,
					JSON.stringify(json, null, 2),
				);
			}
			return json;
		} else if (typeof depth !== 'number') {
			this.typeError('print', 'Number');
		}
		const indent = '  '.repeat(depth),
			str = this.toString(),
			{childNodes, type, firstChild} = this,
			{length} = childNodes;
		if (!str || length === 0 || typeof firstChild === 'string' && firstChild === str) {
			console.log(`${indent}\x1B[32m<%s>\x1B[0m${noWrap(str)}\x1B[32m</%s>\x1B[0m`, type, type);
			return undefined;
		}
		Parser.info(`${indent}<${type}>`);
		let i = this.getPadding();
		if (i) {
			console.log(`${indent}  ${noWrap(str.slice(0, i))}`);
		}
		for (let j = 0; j < length; j++) {
			const child = childNodes[j],
				childStr = String(child),
				gap = j === length - 1 ? 0 : this.getGaps(j);
			if (!childStr) {
				// pass
			} else if (typeof child === 'string') {
				console.log(`${indent}  ${noWrap(child)}`);
			} else {
				child.print('markup', depth + 1);
			}
			i += childStr.length + gap;
			if (gap) {
				console.log(`${indent}  ${noWrap(str.slice(i - gap, i))}`);
			}
		}
		if (i < str.length) {
			console.log(`${indent}  ${noWrap(str.slice(i))}`);
		}
		Parser.info(`${indent}</${type}>`);
		return undefined;
	}

	/**
	 * 获取某一行的wikitext
	 * @param {number} n 行号
	 */
	getLine(n) {
		return this.toString().split('\n', n + 1).at(-1);
	}
}

Parser.classes.AstElement = __filename;
module.exports = AstElement;
