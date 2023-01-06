'use strict';

const fs = require('fs'),
	{externalUse} = require('../util/debug'),
	{toCase, noWrap} = require('../util/string'),
	{nth} = require('./ranges'),
	parseSelector = require('../parser/selector'),
	Parser = require('..'),
	AstNode = require('./node'),
	Text = require('./text');

/**
 * 检测:lang()伪选择器
 * @param {AstElement & {attributes: Records<string, string|true>}} node 节点
 * @param {RegExp} regex 语言正则
 */
const matchesLang = ({attributes}, regex) => {
	const /** @type {string} */ lang = attributes?.lang;
	return typeof lang === 'string' && regex.test(lang);
};

/** 类似HTMLElement */
class AstElement extends AstNode {
	/** @type {string} */ name;

	/**
	 * 全部非文本子节点
	 * @complexity `n`
	 */
	get children() {
		const /** @type {this[]} */ children = this.childNodes.filter(({type}) => type !== 'text');
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
		return this.childNodes.find(({type}) => type !== 'text');
	}

	/**
	 * 末位非文本子节点
	 * @returns {this}
	 */
	get lastElementChild() {
		return this.childNodes.findLast(({type}) => type !== 'text');
	}

	/** 父节点 */
	get parentElement() {
		return this.parentNode;
	}

	/**
	 * AstElement.prototype.text()的getter写法
	 * @complexity `n`
	 */
	get outerText() {
		return this.text();
	}

	/**
	 * 不可见
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
		while (nextSibling?.text() === '') {
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
		while (previousSibling?.text() === '') {
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
	 * @param {boolean} deep 是否从根节点开始销毁
	 * @throws `Error` 不能销毁子节点
	 */
	destroy(deep) {
		if (this.parentNode && !deep) {
			throw new Error('不能销毁子节点！');
		}
		this.parentNode?.destroy(deep);
		for (const child of this.childNodes) {
			child.setAttribute('parentNode');
		}
		Object.setPrototypeOf(this, null);
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
	 * 在末尾批量插入子节点
	 * @param {...Text|this} elements 插入节点
	 * @complexity `n`
	 */
	append(...elements) {
		for (const element of elements) {
			this.appendChild(element);
		}
	}

	/**
	 * 在开头批量插入子节点
	 * @param {...Text|this} elements 插入节点
	 * @complexity `n`
	 */
	prepend(...elements) {
		for (let i = 0; i < elements.length; i++) {
			this.insertAt(elements[i], i);
		}
	}

	/**
	 * 批量替换子节点
	 * @param {...Text|this} elements 新的子节点
	 * @complexity `n`
	 */
	replaceChildren(...elements) {
		for (let i = this.childNodes.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
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
		const /** @type {Text} */ oldText = this.childNodes.at(i),
			{type, data, constructor: {name}} = oldText;
		if (type !== 'text') {
			throw new RangeError(`第 ${i} 个子节点是 ${name}！`);
		}
		oldText.setAttribute('data', str);
		return data;
	}

	/** 是否受保护。保护条件来自Token，这里仅提前用于:required和:optional伪选择器。 */
	#isProtected() {
		const /** @type {{parentNode: AstElement & {constructor: {fixed: boolean}}}} */ {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const {childNodes, constructor: {fixed}} = parentNode,
			protectedIndices = parentNode.getAttribute('protectedChildren')?.applyTo(childNodes);
		return fixed || protectedIndices?.includes(childNodes.indexOf(this));
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
	 * @this {AstElement & {link: string, constructor: {fixed: boolean}}}
	 * @param {SelectorArray} step 解析后的选择器
	 * @throws `SyntaxError` 未定义的伪选择器
	 */
	#matches(step) {
		const {parentNode, type, name, childNodes, link, constructor: {fixed, name: tokenName}} = this,
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
						return !childNodes.some(child => child instanceof AstElement || String(child));
					case ':parent':
						return childNodes.some(child => child instanceof AstElement || String(child));
					case ':header':
						return type === 'heading';
					case ':hidden':
						return this.text() === '';
					case ':visible':
						return this.text() !== '';
					case ':only-whitespace':
						return this.text().trim() === '';
					case ':any-link':
						return type === 'link' || type === 'free-ext-link' || type === 'ext-link'
							|| (type === 'file' || type === 'gallery-image' && link);
					case ':local-link':
						return (type === 'link' || type === 'file' || type === 'gallery-image')
							&& link?.startsWith('#');
					case ':read-only':
						return fixed;
					case ':read-write':
						return !fixed;
					case ':invalid':
						return type === 'table-inter' || tokenName === 'HiddenToken';
					case ':required':
						return this.#isProtected() === true;
					case ':optional':
						return this.#isProtected() === false;
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
				case 'lang': {
					const regex = new RegExp(`^${s}(?:-|$)`, 'u');
					return matchesLang(this, regex)
						|| this.getAncestors().some(ancestor => matchesLang(ancestor, regex));
				}
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
			return Parser.run(() => {
				const stack = parseSelector(selector),
					/** @type {Set<string>} */
					pseudos = new Set(stack.flat(2).filter(step => typeof step === 'string' && step.startsWith(':')));
				if (pseudos.size > 0) {
					Parser.warn('检测到伪选择器，请确认是否需要将":"转义成"\\:"。', pseudos);
				}
				return stack.some(condition => this.matches(condition));
			});
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
				default: // ' '
					return this.getAncestors().some(ancestor => ancestor.matches(selector));
			}
		}
		return false;
	}

	/**
	 * 还原为wikitext
	 * @param {string} selector
	 * @param {string} separator 子节点间的连接符
	 */
	toString(selector, separator = '') {
		return selector && this.matches(selector)
			? ''
			: this.childNodes.map(child => child.toString(selector)).join(separator);
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
	compareDocumentPosition(other) {
		if (!(other instanceof AstElement)) {
			this.typeError('compareDocumentPosition', 'AstElement');
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
	 * 符合选择器的第一个后代节点
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
	 * 符合选择器的所有后代节点
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
	 * 类选择器
	 * @param {string} className 类名之一
	 */
	getElementsByClassName(className) {
		return typeof className === 'string'
			? this.querySelectorAll(`[className~="${className.replaceAll(/(?<!\\)"/gu, '\\"')}"]`)
			: this.typeError('getElementsByClassName', 'String');
	}

	/**
	 * 标签名选择器
	 * @param {string} name 标签名
	 */
	getElementsByTagName(name) {
		if (typeof name === 'string') {
			name = name.replaceAll(/(?<!\\)"/gu, '\\"');
			return this.querySelectorAll(`ext[name="${name}"], html[name="${name}"]`);
		}
		return this.typeError('getElementsByTagName', 'String');
	}

	/**
	 * 获取某一行的wikitext
	 * @param {number} n 行号
	 */
	getLine(n) {
		return String(this).split('\n', n + 1).at(-1);
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
		const text = String(this);
		if (index >= -text.length && index < text.length && Number.isInteger(index)) {
			const lines = text.slice(0, index).split('\n');
			return {top: lines.length - 1, left: lines.at(-1).length};
		}
		return undefined;
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
		}
		const lines = String(this).split('\n');
		return top >= 0 && left >= 0 && Number.isInteger(top) && Number.isInteger(left)
			&& lines.length >= top + 1 && lines[top].length >= left
			? lines.slice(0, top).reduce((acc, curLine) => acc + curLine.length + 1, 0) + left
			: undefined;
	}

	/**
	 * 获取行数和最后一行的列数
	 * @complexity `n`
	 */
	#getDimension() {
		const lines = String(this).split('\n');
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
		let /** @type {(Text|this)[]} */ childNodes;

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
		return j === undefined
			? this.parentNode?.posFromIndex(this.getRelativeIndex()) ?? {top: 0, left: 0}
			: this.posFromIndex(this.getRelativeIndex(j));
	}

	/**
	 * 获取当前节点的行列位置和大小
	 * @complexity `n`
	 */
	getBoundingClientRect() {
		const root = this.getRootNode();
		return {...this.#getDimension(), ...root.posFromIndex(this.getAbsoluteIndex())};
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

	/**
	 * 位置、大小和padding
	 * @complexity `n`
	 */
	get style() {
		return {...this.#getPosition(), ...this.#getDimension(), padding: this.getPadding()};
	}

	/** 内部高度 */
	get clientHeight() {
		const {innerText} = this;
		return innerText?.split('\n')?.length;
	}

	/** 内部宽度 */
	get clientWidth() {
		const {innerText} = this;
		return innerText?.split('\n')?.at(-1)?.length;
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
					childNodes: childNodes.map(child => child.type === 'text' ? String(child) : child.print('json')),
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
			str = String(this),
			{childNodes, type, firstChild} = this,
			{length} = childNodes;
		if (!str || length === 0 || firstChild.type === 'text' && String(firstChild) === str) {
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
			} else if (child.type === 'text') {
				console.log(`${indent}  ${noWrap(String(child))}`);
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
}

Parser.classes.AstElement = __filename;
module.exports = AstElement;
