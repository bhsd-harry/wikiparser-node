'use strict';

const {typeError, externalUse} = require('../util/debug'),
	{toCase} = require('../util/string'),
	{nth} = require('./ranges'),
	EventEmitter = require('events'),
	AstNode = require('./node'),
	/** @type {Parser} */ Parser = require('..');

class AstElement extends AstNode {
	/** @type {string} */ type;
	/** @type {string} */ name;
	#events = new EventEmitter();

	/** @complexity `n` */
	get children() {
		const /** @type {this[]} */ children = this.childNodes.filter(ele => ele instanceof AstElement);
		return children;
	}
	/** @complexity `n` */
	get childElementCount() {
		return this.children.length;
	}
	/** @returns {this} */
	get firstElementChild() {
		return this.childNodes.find(ele => ele instanceof AstElement);
	}
	/** @complexity `n` */
	get lastElementChild() {
		return this.children.at(-1);
	}
	get parentElement() {
		return this.parentNode;
	}
	get isConnected() {
		return this.getRootNode().type === 'root';
	}
	/** @complexity `n` */
	get nextElementSibling() {
		const children = this.parentElement?.children;
		return children?.[children?.indexOf(this) + 1];
	}
	/** @complexity `n` */
	get previousElementSibling() {
		const children = this.parentElement?.children;
		return children?.[children?.indexOf(this) - 1];
	}
	/** @complexity `n` */
	get hidden() {
		return this.text() === '';
	}
	/** @complexity `n` */
	get nextVisibleSibling() {
		let {nextSibling} = this;
		while (nextSibling === '' || nextSibling instanceof AstElement && nextSibling.hidden) {
			({nextSibling} = nextSibling);
		}
		return nextSibling;
	}
	/** @complexity `n` */
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

	/** @complexity `n` */
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
	 * @param {string|string[]} types
	 * @param {AstListener} listener
	 * @param {{once: boolean}} options
	 */
	addEventListener(types, listener, options) {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.addEventListener(type, listener, options);
			}
		} else if (typeof types !== 'string' || typeof listener !== 'function') {
			typeError(this, 'addEventListener', 'String', 'Function');
		} else {
			this.#events[options?.once ? 'once' : 'on'](types, listener);
		}
	}

	/**
	 * @param {string|string[]} types
	 * @param {AstListener} listener
	 */
	removeEventListener(types, listener) {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.removeEventListener(type, listener);
			}
		} else if (typeof types !== 'string' || typeof listener !== 'function') {
			typeError(this, 'removeEventListener', 'String', 'Function');
		} else {
			this.#events.off(types, listener);
		}
	}

	/** @param {string|string[]} types */
	removeAllEventListeners(types) {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.removeAllEventListeners(type);
			}
		} else if (types !== undefined && typeof types !== 'string') {
			typeError(this, 'removeAllEventListeners', 'String');
		} else {
			this.#events.removeAllListeners(types);
		}
	}

	/**
	 * @param {string} type
	 * @returns {AstListener[]}
	 */
	listEventListeners(type) {
		if (typeof type !== 'string') {
			typeError(this, 'listEventListeners', 'String');
		}
		return this.#events.listeners(type);
	}

	/**
	 * @param {AstEvent} e
	 * @param {any} data
	 */
	dispatchEvent(e, data) {
		if (!(e instanceof Event)) {
			typeError(this, 'dispatchEvent', 'Event');
		} else if (!e.target) { // 初始化
			Object.defineProperty(e, 'target', {value: this, enumerable: true});
			e.stopPropagation = function() {
				Object.defineProperty(this, 'bubbles', {value: false});
			};
		}
		Object.defineProperties(e, { // 每次bubble更新
			prevTarget: {value: e.currentTarget, enumerable: true, configurable: true},
			currentTarget: {value: this, enumerable: true, configurable: true},
		});
		this.#events.emit(e.type, e, data);
		if (e.bubbles && this.parentElement) {
			this.parentElement.dispatchEvent(e, data);
		}
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
	 */
	setAttribute(key, value) {
		if (key === 'name' && externalUse('setAttribute')) {
			throw new RangeError(`禁止手动指定 ${key} 属性！`);
		}
		return super.setAttribute(key, value);
	}

	/** @param {number} i */
	removeAt(i) {
		const element = super.removeAt(i),
			e = new Event('remove', {bubbles: true});
		this.dispatchEvent(e, {position: i, removed: element});
		return element;
	}

	/**
	 * @template {string|this} T
	 * @param {T} element
	 * @complexity `n`
	 */
	insertAt(element, i = this.childNodes.length) {
		super.insertAt(element, i);
		const e = new Event('insert', {bubbles: true});
		this.dispatchEvent(e, {position: i < 0 ? i + this.childNodes.length - 1 : i, inserted: element});
		return element;
	}

	/** @param {string} str */
	setText(str, i = 0) {
		const oldText = super.setText(str, i),
			e = new Event('text', {bubbles: true});
		this.dispatchEvent(e, {position: i, oldText, newText: str});
		return oldText;
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	append(...elements) {
		for (const element of elements) {
			this.appendChild(element);
		}
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	prepend(...elements) {
		for (const [i, element] of elements.entries()) {
			this.insertAt(element, i);
		}
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	replaceChildren(...elements) {
		for (let i = this.childNodes.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
	}

	/**
	 * @param {(string|this)[]} elements
	 * @param {number} offset
	 * @complexity `n`
	 */
	#insertAdjacent(elements, offset) {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		const i = parentNode.childNodes.indexOf(this) + offset;
		for (const [j, element] of elements.entries()) {
			parentNode.insertAt(element, i + j);
		}
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	after(...elements) {
		this.#insertAdjacent(elements, 1);
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	before(...elements) {
		this.#insertAdjacent(elements, 0);
	}

	/** @complexity `n` */
	remove() {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		parentNode.removeChild(this);
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	replaceWith(...elements) {
		this.after(...elements);
		this.remove();
	}

	/**
	 * @param {string} key
	 * @param {string|undefined} equal - `equal`存在时`val`和`i`也一定存在
	 * @param {string|undefined} val
	 * @param {string|undefined} i
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
				thisVals = thisVals.split(/\s/);
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

	/** @type {Record<pseudo, boolean>} */ static #pseudo = {
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
	};
	/** @type {pseudo[]} */ static #pseudoKeys = Object.keys(AstElement.#pseudo);
	static #pseudoRegex = new RegExp(
		`:(${this.#pseudoKeys.join('|')})(?:\\(\\s*("[^"]*"|'[^']*'|[^()]*?)\\s*\\))?(?=:|\\s*(?:,|$))`,
		'g',
	);
	static #simplePseudoRegex = new RegExp(`:(?:${this.#pseudoKeys.join('|')})(?:\\(.*?\\))?(?=:|\\s*(?:,|$))`, 'g');

	/**
	 * @returns {boolean}
	 * @complexity `n`
	 */
	matches(selector = '', simple = false) {
		if (typeof selector !== 'string') {
			typeError(this, 'matches', 'String');
		} else if (!selector.trim()) {
			return true;
		}
		simple &&= Parser.running;
		const /** @type {Record<string, string>} */ escapedQuotes = {'"': '&quot;', "'": '&apos;'},
			escapedSelector = selector.replace(/\\["']/g, m => escapedQuotes[m[1]]);
		if (simple || !AstElement.#pseudoRegex.test(escapedSelector)) {
			if (!simple && selector.includes(',')) {
				return Parser.run(() => selector.split(',').some(str => this.matches(str, true)));
			}
			const mt = escapedSelector.match(AstElement.#simplePseudoRegex);
			if (mt) {
				Parser.error(
					'检测到不规范的伪选择器！嵌套伪选择器时请使用引号包裹内层，多层嵌套时请使用"\\"转义引号。',
					mt.map(s => s.replace(
						/&(quot|apos);/g,
						/** @param {string} p1 */ (_, p1) => `\\${p1 === 'quot' ? '"' : "'"}`,
					)),
				);
			}
			const /** @type {Record<string, string>} */ entities = {comma: ',', ratio: ':'},
				/** @type {string[][]} */ attributes = [],
				plainSelector = selector.replace(
					/&(comma|ratio);/g, /** @param {string} name */ (_, name) => entities[name],
				).replace(
					/\[\s*(\w+)\s*(?:([~|^$*!]?=)\s*("[^"]*"|'[^']*'|[^[\]]*?)\s*(\si)?\s*)?]/g,
					/** @type {function(...string): ''} */ (_, key, equal, val, i) => {
						if (equal) {
							const quotes = val.match(/^(["']).*\1$/)?.[1];
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
			return (!type || this.type === type) && (!name || this.name === name)
				&& attributes.every(args => this.matchesAttr(...args));
		}
		/*
		 * 先将`\\'`转义成`&apos;`，将`\\"`转义成`&quot;`，即escapedSelector
		 * 在去掉一重`:pseudo()`时，如果使用了`'`，则将内部的`&apos;`解码成`'`；如果使用了`"`，则将内部的`&quot;`解码成`"`
		 */
		const /** @type {pseudoCall} */ calls = Object.fromEntries(AstElement.#pseudoKeys.map(f => [f, []])),
			selectors = escapedSelector.replace(
				AstElement.#pseudoRegex,
				/** @type {function(...string): string} */ (m, f, arg) => {
					if (!arg) {
						calls[f].push('');
						return m;
					}
					const quotes = arg.match(/^(["']).*\1$/)?.[1];
					calls[f].push(quotes ? arg.slice(1, -1).replaceAll(escapedQuotes[quotes], quotes) : arg);
					return `:${f}(${calls[f].length - 1})`;
				},
			).split(','),
			{parentElement, hidden} = this,
			childNodes = parentElement?.childNodes,
			childrenOfType = parentElement?.children?.filter(child => child.type === this.type),
			index = (childNodes?.indexOf(this) ?? 0) + 1,
			indexOfType = (childrenOfType?.indexOf(this) ?? 0) + 1,
			lastIndex = (childNodes?.length ?? 1) - index + 1,
			lastIndexOfType = (childrenOfType?.length ?? 1) - indexOfType + 1,
			content = this.toString(),
			plainPseudo = AstElement.#pseudoKeys.filter(f => !AstElement.#pseudo[f] && calls[f].length);
		if (plainPseudo.length) {
			Parser.warn('检测到伪选择器，请确认是否需要将":"转义成"&ratio;"。', plainPseudo);
		}
		return selectors.some(str => {
			const /** @type {pseudoCall} */ curCalls = Object.fromEntries(AstElement.#pseudoKeys.map(f => [f, []]));
			str = str.replace(AstElement.#pseudoRegex, /** @type {function(...string): ''} */ (_, f, i) => {
				curCalls[f].push(i ? calls[f][i] : '');
				return '';
			});
			return Parser.run(() => this.matches(str, true))
				&& (curCalls.root.length === 0 || !parentElement)
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
				&& (curCalls['only-child'].length === 0 || !parentElement || childNodes.length === 1)
				&& (curCalls['only-of-type'].length === 0 || !parentElement || childrenOfType.length === 1)
				&& (curCalls.empty.length === 0 || this.childElementCount === 0)
				&& curCalls.contains.every(s => content.includes(s))
				&& curCalls.has.every(s => Boolean(this.querySelector(s)))
				&& (curCalls.header.length === 0 || this.type === 'heading')
				&& (curCalls.parent.length === 0 || this.childElementCount > 0)
				&& (curCalls.hidden.length === 0 || hidden)
				&& (curCalls.visible.length === 0 || !hidden);
		});
	}

	getAncestors() {
		const /** @type {this[]} */ ancestors = [];
		let {parentElement} = this;
		while (parentElement) {
			ancestors.push(parentElement);
			({parentElement} = parentElement);
		}
		return ancestors;
	}

	/**
	 * @param {this} other
	 * @complexity `n`
	 */
	comparePosition(other) {
		if (!(other instanceof AstElement)) {
			typeError(this, 'comparePosition', 'AstElement');
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

	closest(selector = '') {
		let {parentElement} = this;
		while (parentElement) {
			if (parentElement.matches(selector)) {
				return parentElement;
			}
			({parentElement} = parentElement);
		}
	}

	/**
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
	}

	/** @complexity `n` */
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
	 * @param {number} index
	 * @complexity `n`
	 */
	posFromIndex(index) {
		if (typeof index !== 'number') {
			typeError(this, 'posFromIndex', 'Number');
		}
		const text = this.toString();
		if (index < -text.length || index >= text.length || !Number.isInteger(index)) {
			return;
		}
		const lines = text.slice(0, index).split('\n');
		return {top: lines.length - 1, left: lines.at(-1).length};
	}

	/**
	 * @param {number} top
	 * @param {number} left
	 * @complexity `n`
	 */
	indexFromPos(top, left) {
		if (typeof top !== 'number' || typeof left !== 'number') {
			typeError(this, 'indexFromPos', 'Number');
		} else if (top < 0 || left < 0 || !Number.isInteger(top) || !Number.isInteger(left)) {
			return;
		}
		const lines = this.toString().split('\n');
		if (lines.length < top + 1 || lines[top].length < left) {
			return;
		}
		return lines.slice(0, top).reduce((acc, curLine) => acc + curLine.length + 1, 0) + left;
	}

	/** @complexity `n` */
	#getDimension() {
		const lines = this.toString().split('\n');
		return {height: lines.length, width: lines.at(-1).length};
	}

	/**
	 * 获取当前节点的相对位置，或其第`j`个子节点的相对位置
	 * @param {number|undefined} j
	 * @complexity `n`
	 */
	getRelativeIndex(j) {
		if (j !== undefined && typeof j !== 'number') {
			typeError(this, 'getRelativeIndex', 'Number');
		}
		let /** @type {(string|this)[]} */ childNodes;
		/**
		 * 使用前需要先给`childNodes`赋值
		 * @param {number} end
		 * @param {this} parent
		 * @returns {number}
		 */
		const getIndex = (end, parent) => childNodes.slice(0, end).reduce(
			(acc, cur, i) => acc + String(cur).length + parent.getGaps(i),
			0,
		) + parent.getPadding();
		if (j === undefined) {
			const {parentElement} = this;
			if (!parentElement) {
				return 0;
			}
			({childNodes} = parentElement);
			return getIndex(childNodes.indexOf(this), parentElement);
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
		const {parentElement} = this;
		return parentElement ? parentElement.getAbsoluteIndex() + this.getRelativeIndex() : 0;
	}

	/**
	 * 获取当前节点的相对位置，或其第`j`个子节点的相对位置
	 * @param {number|undefined} j
	 * @complexity `n`
	 */
	#getPosition(j) {
		if (j === undefined) {
			const {parentElement} = this;
			if (!parentElement) {
				return {top: 0, left: 0};
			}
			return parentElement.posFromIndex(this.getRelativeIndex());
		}
		return this.posFromIndex(this.getRelativeIndex(j));
	}

	/** @complexity `n` */
	getBoundingClientRect() {
		const root = this.getRootNode();
		return {...this.#getDimension(), ...root.posFromIndex(this.getAbsoluteIndex())};
	}

	/** @complexity `n` */
	get offsetHeight() {
		return this.#getDimension().height;
	}
	/** @complexity `n` */
	get offsetWidth() {
		return this.#getDimension().width;
	}
	/** @complexity `n` */
	get offsetTop() {
		return this.#getPosition().top;
	}
	/** @complexity `n` */
	get offsetLeft() {
		return this.#getPosition().left;
	}

	getPadding() {
		return 0;
	}

	getGaps() {
		return 0;
	}

	/** @complexity `n` */
	get style() {
		return {...this.#getPosition(), ...this.#getDimension(), padding: this.getPadding()};
	}

	/**
	 * 不作为特殊语法的文字
	 * @returns {[number, string][]}
	 * @complexity `n`
	 */
	plain() {
		const index = this.getAbsoluteIndex();
		return this.childNodes.flatMap((node, i) => {
			if (node instanceof AstElement) {
				return node.plain();
			}
			return node ? [[index + this.getRelativeIndex(i), node]] : [];
		});
	}
}

Parser.classes.AstElement = __filename;
module.exports = AstElement;
