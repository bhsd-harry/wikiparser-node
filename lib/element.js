'use strict';

const fs = require('fs'),
	{externalUse} = require('../util/debug'),
	{toCase, noWrap} = require('../util/string'),
	{nth} = require('./ranges'),
	EventEmitter = require('events'),
	AstNode = require('./node'),
	Parser = require('..');

const /** @type {Record<pseudo, boolean>} */ pseudo = {
		root: false,
		is: true,
		not: true,
		'nth-child': true,
		'nth-of-type': true,
		'nth-last-child': true,
		'nth-last-of-type': true,
		'first-child': false,
		'first-of-type': false,
		'last-child': false,
		'last-of-type': false,
		'only-child': false,
		'only-of-type': false,
		empty: false,
		contains: true,
		has: true,
		header: false,
		parent: false,
		hidden: false,
		visible: false,
	},
	/** @type {pseudo[]} */ pseudoKeys = Object.keys(pseudo),
	pseudoRegex = new RegExp(
		`:(${pseudoKeys.join('|')})(?:\\(\\s*("[^"]*"|'[^']*'|[^()]*?)\\s*\\))?(?=:|\\s*(?:,|$))`,
		'gu',
	),
	simplePseudoRegex = new RegExp(`:(?:${pseudoKeys.join('|')})(?:\\(.*?\\))?(?=:|\\s*(?:,|$))`, 'gu');

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
	 * 检查是否符合选择器
	 * @param {string} selector
	 * @param {boolean} simple 是否不含伪选择器
	 * @returns {boolean}
	 * @complexity `n`
	 */
	matches(selector = '', simple = false) {
		if (typeof selector !== 'string') {
			this.typeError('matches', 'String');
		} else if (!selector.trim()) {
			return true;
		}
		simple &&= Parser.running;
		const /** @type {Record<string, string>} */ escapedQuotes = {'"': '&quot;', "'": '&apos;'},
			escapedSelector = selector.replaceAll('\\"', '&quot;').replaceAll("\\'", '&apos;');
		if (simple || escapedSelector.search(pseudoRegex) === -1) {
			if (!simple && selector.includes(',')) {
				return Parser.run(() => selector.split(',').some(str => this.matches(str, true)));
			}
			const mt = escapedSelector.match(simplePseudoRegex);
			if (mt) {
				Parser.error(
					'检测到不规范的伪选择器！嵌套伪选择器时请使用引号包裹内层，多层嵌套时请使用"\\"转义引号。',
					mt.map(s => s.replaceAll('&quot;', '\\"').replaceAll('&apos;', "\\'")),
				);
			}
			const /** @type {string[][]} */ attributes = [],
				plainSelector = selector.replaceAll('&comma;', ',').replaceAll('&ratio;', ':').replaceAll(
					/\[\s*(\w+)\s*(?:([~|^$*!]?=)\s*("[^"]*"|'[^']*'|[^\s[\]]+)(?:\s+(i))?\s*)?\]/gu,
					/** @type {function(...string): ''} */ (_, key, equal, val, i) => {
						if (equal) {
							const quotes = /^(["']).*\1$/u.exec(val)?.[1];
							attributes.push([
								key,
								equal,
								quotes ? val.slice(1, -1).replaceAll(escapedQuotes[quotes], quotes) : val,
								i,
							]);
						} else {
							attributes.push([key]);
						}
						return '';
					},
				),
				[type, ...parts] = plainSelector.trim().split('#'),
				name = parts.join('#');
			return (!type || this.type === type || Boolean(Parser.typeAliases[this.type]?.includes(type)))
				&& (!name || this.name === name)
				&& attributes.every(args => this.matchesAttr(...args));
		}

		/*
		 * 先将`\\'`转义成`&apos;`，将`\\"`转义成`&quot;`，即escapedSelector
		 * 在去掉一重`:pseudo()`时，如果使用了`'`，则将内部的`&apos;`解码成`'`；如果使用了`"`，则将内部的`&quot;`解码成`"`
		 */
		const /** @type {pseudoCall} */ calls = Object.fromEntries(pseudoKeys.map(f => [f, []])),
			selectors = escapedSelector.replace(
				pseudoRegex,
				/** @type {function(...string): string} */ (m, f, arg) => {
					if (!arg) {
						calls[f].push('');
						return m;
					}
					const quotes = /^(["']).*\1$/u.exec(arg)?.[1];
					calls[f].push(quotes ? arg.slice(1, -1).replaceAll(escapedQuotes[quotes], quotes) : arg);
					return `:${f}(${calls[f].length - 1})`;
				},
			).split(','),
			{parentNode, hidden, childElementCount} = this,
			childNodes = parentNode?.childNodes,
			childrenOfType = parentNode?.children?.filter(child => child.type === this.type),
			index = (childNodes?.indexOf(this) ?? 0) + 1,
			indexOfType = (childrenOfType?.indexOf(this) ?? 0) + 1,
			lastIndex = (childNodes?.length ?? 1) - index + 1,
			lastIndexOfType = (childrenOfType?.length ?? 1) - indexOfType + 1,
			content = this.toString(),
			plainPseudo = pseudoKeys.filter(f => !pseudo[f] && calls[f].length > 0);
		if (plainPseudo.length > 0) {
			Parser.warn('检测到伪选择器，请确认是否需要将":"转义成"&ratio;"。', plainPseudo);
		}
		return selectors.some(str => {
			const /** @type {pseudoCall} */ curCalls = Object.fromEntries(pseudoKeys.map(f => [f, []]));
			str = str.replace(pseudoRegex, /** @type {function(...string): ''} */ (_, f, i) => {
				curCalls[f].push(i ? calls[f][i] : '');
				return '';
			});
			return Parser.run(() => this.matches(str, true))
				&& (curCalls.root.length === 0 || !parentNode)
				&& curCalls.is.every(s => this.matches(s))
				&& !curCalls.not.some(s => this.matches(s))
				&& curCalls['nth-child'].every(s => nth(s, index))
				&& curCalls['nth-of-type'].every(s => nth(s, indexOfType))
				&& curCalls['nth-last-child'].every(s => nth(s, lastIndex))
				&& curCalls['nth-last-of-type'].every(s => nth(s, lastIndexOfType))
				&& (curCalls['first-child'].length === 0 || nth('1', index))
				&& (curCalls['first-of-type'].length === 0 || nth('1', indexOfType))
				&& (curCalls['last-child'].length === 0 || nth('1', lastIndex))
				&& (curCalls['last-of-type'].length === 0 || nth('1', lastIndexOfType))
				&& (curCalls['only-child'].length === 0 || !parentNode || childNodes.length === 1)
				&& (curCalls['only-of-type'].length === 0 || !parentNode || childrenOfType.length === 1)
				&& (curCalls.empty.length === 0 || childElementCount === 0)
				&& curCalls.contains.every(s => content.includes(s))
				&& curCalls.has.every(s => Boolean(this.querySelector(s)))
				&& (curCalls.header.length === 0 || this.type === 'heading')
				&& (curCalls.parent.length === 0 || childElementCount > 0)
				&& (curCalls.hidden.length === 0 || hidden)
				&& (curCalls.visible.length === 0 || !hidden);
		});
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
