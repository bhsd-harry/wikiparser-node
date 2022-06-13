'use strict';

const {typeError, externalUse} = require('../util/debug'),
	{toCase} = require('../util/string'),
	{nth} = require('./range'),
	AstNode = require('./node'),
	/** @type {Parser} */ Parser = require('..'),
	EventEmitter = require('events');

class AstElement extends AstNode {
	/** @type {string} */ type;
	/** @type {string} */ name;
	#events = new EventEmitter();

	get children() {
		const /** @type {AstElement[]} */ children = this.childNodes.filter(ele => ele instanceof AstElement);
		return children;
	}
	get childElementCount() {
		return this.children.length;
	}
	get firstElementChild() {
		return this.children[0];
	}
	get lastElementChild() {
		return this.children.at(-1);
	}
	/** @returns {AstElement} */
	get parentElement() {
		return this.parentNode;
	}
	get nextElementSibling() {
		const children = this.parentElement?.children;
		return children?.[children?.indexOf(this) + 1];
	}
	get previousElementSibling() {
		const children = this.parentElement?.children;
		return children?.[children?.indexOf(this) - 1];
	}

	constructor() {
		super();
		this.seal('name');
	}

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
	 * @param {string} type
	 * @param {AstListener} listener
	 * @param {{once: boolean}} options
	 */
	addEventListener(type, listener, options) {
		if (typeof type !== 'string' || typeof listener !== 'function') {
			typeError('String', 'Function');
		} else if (typeof options === 'object' && options.once) {
			this.#events.once(type, listener);
		} else {
			this.#events.on(type, listener);
		}
	}

	/**
	 * @param {string} type
	 * @param {AstListener} listener
	 */
	removeEventListener(type, listener) {
		if (typeof type !== 'string' || typeof listener !== 'function') {
			typeError('String', 'Function');
		}
		this.#events.off(type, listener);
	}

	/** @param {string} type */
	removeAllEventListeners(type) {
		if (type !== undefined && typeof type !== 'string') {
			typeError('String');
		}
		this.#events.removeAllListeners(type);
	}

	/**
	 * @param {string} type
	 * @returns {AstListener[]}
	 */
	listEventListeners(type) {
		if (typeof type !== 'string') {
			typeError('String');
		}
		return this.#events.listeners(type);
	}

	/**
	 * @param {AstEvent} e
	 * @param {any} data
	 */
	dispatchEvent(e, data) {
		if (!(e instanceof Event)) {
			typeError('Event');
		} else if (e.target === undefined) { // 初始化
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
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
	 */
	setAttribute(key, value) {
		if (key === 'name') {
			if (externalUse('setAttribute')) {
				throw new RangeError('禁止手动指定 name 属性！');
			} else if (!['string', 'symbol'].includes(typeof value)) {
				typeError('String', 'Symbol');
			}
			Object.defineProperty(this, 'name', {value, enumerable: Boolean(value)});
			return this;
		}
		return super.setAttribute(key, value);
	}

	/** @param {number} i */
	removeAt(i) {
		const /** @type {string|AstElement} */ element = super.removeAt(i),
			e = new Event('remove', {bubbles: true});
		this.dispatchEvent(e, {position: i, removed: element});
		return element;
	}

	/**
	 * @template {string|AstElement} T
	 * @param {T} element
	 */
	insertAt(element, i = this.childNodes.length) {
		super.insertAt(element, i);
		const e = new Event('insert', {bubbles: true});
		this.dispatchEvent(e, {position: i, inserted: element});
		return element;
	}

	/** @param {...(string|AstElement)} elements */
	append(...elements) {
		for (const element of elements) {
			this.appendChild(element);
		}
	}

	/** @param {...(string|AstElement)} elements */
	prepend(...elements) {
		for (const [i, element] of elements.entries()) {
			this.insertAt(element, i);
		}
	}

	/** @param {...(string|AstElement)} elements */
	replaceChildren(...elements) {
		for (let i = this.childNodes.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
	}

	/** @param {...(string|AstElement)} elements */
	after(...elements) {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		const i = parentNode.childNodes.indexOf(this) + 1;
		for (const [j, element] of elements.entries()) {
			parentNode.insertAt(element, i + j);
		}
	}

	/** @param {...(string|AstElement)} elements */
	before(...elements) {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		const i = parentNode.childNodes.indexOf(this);
		for (const [j, element] of elements.entries()) {
			parentNode.insertAt(element, i + j);
		}
	}

	remove() {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		parentNode.removeChild(this);
	}

	/** @param {...(string|AstElement)} elements */
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
	/** @type {pseudoCall} */ static #pseudoCall = Object.fromEntries(AstElement.#pseudoKeys.map(f => [f, []]));

	/** @returns {boolean} */
	matches(selector = '') {
		if (typeof selector !== 'string') {
			typeError('String');
		} else if (!selector.trim()) {
			return true;
		}
		const /** @type {Record<string, string>} */ escapedQuotes = {'"': '&quot;', "'": '&apos;'},
			escapedSelector = selector.replace(/\\["']/g, m => escapedQuotes[m[1]]),
			pseudoRegex = new RegExp(
				`:(${AstElement.#pseudoKeys.join('|')})(?:\\(\\s*("[^"]*"|'[^']*'|[^()]*?)\\s*\\))?(?=:|\\s*(?:,|$))`,
				'g',
			),
			simplePseudoRegex = new RegExp(
				`:(?:${AstElement.#pseudoKeys.join('|')})(?:\\(.*?\\))?(?=:|\\s*(?:,|$))`,
				'g',
			),
			hasPseudo = pseudoRegex.test(escapedSelector);
		if (!hasPseudo) {
			if (selector.includes(',')) {
				return selector.split(',').some(str => this.matches(str));
			}
			const mt = escapedSelector.match(simplePseudoRegex);
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
				/** @type {string} */ plainSelector = selector.replace(
					/&(comma|ratio);/g, /** @param {string} name */ (_, name) => entities[name],
				).replace(
					/\[\s*(\w+)\s*(?:([~|^$*!]?=)\s*("[^"]*"|'[^']*'|[^[\]]*?)\s*(\si)?\s*)?]/g,
					/** @type {(_: string, key: string, equal?:string, val?: string, i?: string) => ''} */
					(_, key, equal, val, i) => {
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
		pseudoRegex.lastIndex = 0;
		const calls = structuredClone(AstElement.#pseudoCall),
			selectors = escapedSelector.replace(
				pseudoRegex,
				/** @type {(_: string, f: pseudo, arg?: string) => string} */
				(_, f, arg) => {
					if (!arg) {
						calls[f].push('');
						return _;
					}
					const quotes = arg.match(/^(["']).*\1$/)?.[1];
					calls[f].push(quotes ? arg.slice(1, -1).replaceAll(escapedQuotes[quotes], quotes) : arg);
					return `:${f}(${calls[f].length - 1})`;
				},
			).split(','),
			{parentElement} = this,
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
			const curCalls = structuredClone(AstElement.#pseudoCall);
			pseudoRegex.lastIndex = 0;
			str = str.replace(
				pseudoRegex,
				/** @type {(_: string, f: pseudo, i?: string) => ''} */
				(_, f, i) => {
					curCalls[f].push(i ? calls[f][i] : '');
					return '';
				},
			);
			return this.matches(str)
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
				&& (curCalls.hidden.length === 0 || this.text() === '')
				&& (curCalls.visible.length === 0 || this.text() !== '');
		});
	}

	getAncestors() {
		const /** @type {AstElement[]} */ ancestors = [];
		let {parentElement} = this,
			element;
		while (parentElement) {
			ancestors.push(parentElement);
			element = parentElement;
			({parentElement} = element);
		}
		return ancestors;
	}

	/**
	 * @param {AstElement} a
	 * @param {AstElement} b
	 */
	static comparePosition(a, b) {
		if (!(a instanceof AstElement) || !(b instanceof AstElement)) {
			typeError('AstElement');
		} else if (a === b) {
			return 0;
		} else if (a.contains(b)) {
			return -1;
		} else if (b.contains(a)) {
			return 1;
		} else if (a.getRootNode() !== b.getRootNode()) {
			throw new Error('不在同一个语法树！');
		}
		const aAncestors = [...a.getAncestors().reverse(), a],
			bAncestors = [...b.getAncestors().reverse(), b],
			depth = aAncestors.findIndex((ancestor, i) => bAncestors[i] !== ancestor),
			commonAncestor = aAncestors[depth - 1],
			{childNodes} = commonAncestor;
		return childNodes.indexOf(aAncestors[depth]) - childNodes.indexOf(bAncestors[depth]);
	}

	closest(selector = '') {
		let {parentElement} = this,
			element;
		while (parentElement) {
			if (parentElement.matches(selector)) {
				return parentElement;
			}
			element = parentElement;
			({parentElement} = element);
		}
	}

	/** @returns {AstElement|undefined} */
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

	querySelectorAll(selector = '') {
		const /** @type {AstElement[]} */ descendants = [];
		for (const child of this.children) {
			if (child.matches(selector)) {
				descendants.push(child);
			}
			descendants.push(...child.querySelectorAll(selector));
		}
		return descendants;
	}
}

Parser.classes.AstElement = __filename;
module.exports = AstElement;
