'use strict';
/*
 * PHP解析器的步骤：
 * -1. 替换签名和{{subst:}}，参见Parser::preSaveTransform；这在revision中不可能保留，可以跳过
 * 0. 移除特定字符\x00和\x7f，参见Parser::parse
 * 1. 注释/扩展标签（'<'相关），参见Preprocessor_Hash::buildDomTreeArrayFromText和Sanitizer::decodeTagAttributes
 * 2. 模板/模板变量/标题，注意rightmost法则，以及'-{'和'[['可以破坏'{{'或'{{{'语法，
 *    参见Preprocessor_Hash::buildDomTreeArrayFromText
 * 3. HTML标签（允许不匹配），参见Sanitizer::internalRemoveHtmlTags
 * 4. 表格，参见Parser::handleTables
 * 5. 水平线和状态开关，参见Parser::internalParse
 * 6. 标题，参见Parser::handleHeadings
 * 7. 内链，含文件和分类，参见Parser::handleInternalLinks2
 * 8. 外链，参见Parser::handleExternalLinks
 * 9. ISBN、RFC（未来将废弃，不予支持）和自由外链，参见Parser::handleMagicLinks
 * 10. 段落和列表，参见BlockLevelPass::execute
 * 11. 转换，参见LanguageConverter::recursiveConvertTopLevel
 */

/*
 * \x00\d+.\x7f标记Token：
 * e: ExtToken
 * c: CommentToken
 * !: {{!}}专用
 * t: ArgToken或TranscludeToken
 * h: HeadingToken
 */

const EventEmitter = require('events'),
	{
		MAX_STAGE,
		numberToString, removeComment, toCase, nth,
		typeError, caller, externalUse,
		select, selects, tokenLike,
	} = require('./util'),
	{Ranges} = require('./range');

class Token {
	type = 'root';
	$children;
	/** 解析阶段，参见顶部注释 */ #stage = 0;
	#events = new EventEmitter();
	#config;
	#parent;
	#accum;
	#acceptable;
	/** @type {TokenCollection[]} */ #sections;

	static $ = require('./tokenCollection');
	static warning = true;
	static debugging = false;
	static config = './config';

	/** @type {Object<string, function>} */
	static classes = {};

	/** @param {boolean} force */
	static warn(force, ...args) {
		if (force || Token.warning) {
			console.warn('\x1b[33m%s\x1b[0m', ...args);
		}
	}
	static debug(...args) {
		if (Token.debugging) {
			console.debug('\x1b[34m%s\x1b[0m', ...args);
		}
	}
	static error(...args) {
		console.error('\x1b[31m%s\x1b[0m', ...args);
	}

	/** @param {function} constructor */
	static reload(constructor = Token) {
		const [id] = Object.entries(require.cache).find(([, {exports}]) => exports === constructor);
		delete require.cache[id];
		const /** @type {function} */ Parser = require(id);
		if (constructor === Token) {
			Parser.warning = Token.warning;
			Parser.debugging = Token.debugging;
			Parser.config = Token.config;
			for (const key in Token.classes) {
				Parser.classes[key] = Token.reload(Token.classes[key]);
			}
		}
		return Parser;
	}

	/**
	 * @param {string|number|Token|(string|Token)[]} wikitext
	 * @param {Object<string, any>} config
	 * @param {Token} parent
	 * @param {Token[]} accum
	 * @param {string[]} acceptable
	 */
	constructor(
		wikitext = null,
		config = require(Token.config),
		halfParsed = false,
		parent = null,
		accum = [],
		acceptable = null,
	) {
		wikitext = numberToString(wikitext);
		if (wikitext === null) {
			this.$children = Token.$();
		} else if (typeof wikitext === 'string') {
			this.$children = Token.$(halfParsed ? wikitext : wikitext.replace(/[\x00\x7f]/g, ''));
		} else if (wikitext instanceof Token) {
			this.$children = Token.$(wikitext);
			wikitext.resetParent(this);
		} else if (Array.isArray(wikitext)) {
			this.$children = Token.$(wikitext.map(numberToString).filter(ele => {
				if (ele instanceof Token) {
					ele.resetParent(this);
					return true;
				} else if (typeof ele === 'string') {
					return true;
				}
				return false;
			}));
		} else {
			typeError('String', 'Number', 'Array', 'Token');
		}
		if (acceptable && this.$children.some(ele => !acceptable.includes(ele.constructor.name))) {
			typeError(acceptable);
		}
		const thisCaller = caller();
		let {constructor} = this;
		while (constructor !== Token) {
			thisCaller.shift();
			constructor = Object.getPrototypeOf(constructor);
		}
		if (parent && !thisCaller.slice(1).some(str => /^(?:new \w*Token|\w*Token\.parseOnce)$/.test(str))) {
			Token.error('手动创建新Token时禁止指定parent！');
			parent = null;
		}
		if (parent && !parent.verifyChild(this)) {
			throw new RangeError('指定的父节点非法！');
		}
		this.#parent = parent;
		parent?.$children?.push(this);
		this.#config = config;
		this.#accum = accum;
		accum.push(this);
		this.#acceptable = acceptable;
		this.on('parentRemoved', function debug(oldParent) {
			Token.debug('parentRemoved', oldParent);
		}).on('parentReset', function debug(oldParent, newParent) {
			Token.debug('parentReset', {oldParent, newParent});
		}).on('childDetached', function debug(child, index) {
			Token.debug('childDetached', {child, index});
		}).on('childReplaced', function debug(oldChild, newChild, index) {
			Token.debug('childReplaced', {oldChild, newChild, index});
		});
	}

	[Symbol.iterator]() {
		return this.$children[Symbol.iterator]();
	}

	// ------------------------------ getter and setter ------------------------------ //

	/** @param {string} key */
	get(key) {
		if (typeof key !== 'string') {
			typeError('String');
		} else if (externalUse()) {
			Token.warn(false, 'Token.get方法一般不应直接调用，仅用于代码调试！');
		}
		switch (key) {
			case 'stage':
				return this.#stage;
			case 'parent':
				return this.#parent;
			case 'config':
				return this.#config;
			case 'accum':
				return this.#accum;
			case 'acceptable':
				return this.#acceptable;
			default:
				return this[key];
		}
	}

	/** @param {string} key */
	set(key, value) {
		if (typeof key !== 'string') {
			typeError('String');
		} else if (externalUse()) {
			if (key === 'parent') {
				throw new RangeError(`指定parent请使用Token.${value === null ? 'remove' : 'reset'}Parent方法！`);
			}
			Token.warn(false, 'Token.set方法一般不应直接调用，仅用于代码调试！');
		}
		switch (key) {
			case 'stage':
				this.#stage = value;
				break;
			case 'parent':
				this.#parent = value;
				break;
			case 'acceptable':
				this.#acceptable = value;
				break;
			default:
				this[key] = value;
		}
		return this;
	}

	isPlain() {
		return this.constructor.name === 'Token';
	}

	length() {
		return this.$children.length;
	}

	/** @param {Token} token */
	resetParent(token) {
		if (!(token instanceof Token)) {
			typeError('Token');
		}
		if (externalUse()) {
			Token.warn(false, 'Token.resetParent方法一般不应直接调用，仅用于代码调试！');
		}
		const parent = this.#parent;
		if (parent === token) {
			return this;
		}
		this.#parent = token;
		return this.emit('parentReset', parent, token);
	}

	removeParent() {
		if (externalUse()) {
			Token.warn(false, 'Token.removeParent方法一般不应直接调用，仅用于代码调试！');
		}
		const parent = this.#parent;
		if (parent === null) {
			return this;
		}
		this.#parent = null;
		return this.emit('parentRemoved', parent);
	}

	/** @param {string|string[]} keys */
	freeze(keys) {
		if (externalUse()) {
			Token.warn(false, 'Token.freeze方法一般不应直接调用，仅用于代码调试！');
		}
		keys = typeof keys === 'string' ? [keys] : keys;
		keys.forEach(key => {
			Object.defineProperty(this, key, {writable: false, configurable: false});
		});
		return this;
	}

	toString() {
		return this.$children.toString();
	}

	text() {
		return this.toString();
	}

	// ------------------------------ selector basics ------------------------------ //

	/**
	 * @param {string} key
	 * @param {string|undefined} equal - equal存在时val和i也一定存在
	 * @param {string|undefined} val
	 * @param {string|undefined} i
	 */
	isAttr(key, equal, val, i) {
		if (externalUse()) {
			throw new Error('禁止外部调用Token.isAttr方法！');
		} else if (!equal) {
			return Boolean(this[key]);
		}
		val = toCase(val, i);
		const thisVal = toCase(this[key], i);
		switch (equal) {
			case '~=':
				return typeof this[key] !== 'string' // string也是iterable，但显然不符合意图
					&& this[key]?.[Symbol.iterator] && [...this[key]].some(v => toCase(v, i) === val);
			case '|=':
				return key in this && (thisVal === val || thisVal.startsWith(`${val}-`));
			case '^=':
				return key in this && thisVal.startsWith(val);
			case '$=':
				return key in this && thisVal.endsWith(val);
			case '*=':
				return key in this && thisVal.includes(val);
			case '!=':
				return !(key in this) || thisVal !== val;
			default: // '='
				return key in this && thisVal === val;
		}
	}

	/**
	 * @param {string|Token} selector
	 * @returns {boolean}
	 */
	is(selector = '') {
		if (selector instanceof Token) {
			return this === selector;
		} else if (typeof selector !== 'string') {
			typeError('String', 'Token');
		} else if (!selector.trim()) {
			return true;
		}
		const escapedQuotes = {'"': '&quot;', "'": '&apos;'},
			escapedSelector = selector.replace(/\\["']/g, m => escapedQuotes[m[1]]),
			func = ['not', 'has', 'contains', 'nth-child', 'nth-last-child', 'nth-of-type', 'nth-last-of-type'],
			funcRegex = new RegExp(
				`:(${func.join('|')})\\(\\s*("[^"]*"|'[^']*'|[^()]*?)\\s*\\)(?=:|\\s*(?:,|$))`,
				'g',
			),
			hasFunc = funcRegex.test(escapedSelector);
		if (!hasFunc) {
			if (selector.includes(',')) {
				return selector.split(',').some(str => this.is(str));
			}
			const /** @type {string[][]} */ attributes = [],
				/** @type {string} */ plainSelector = selector.replaceAll('&comma;', ',').replace(
					/\[\s*(\w+)\s*(?:([~|^$*!]?=)\s*("[^"]*"|'[^']*'|[^[\]]*?)\s*( i)?\s*)?]/g,
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
				&& attributes.every(args => this.isAttr(...args));
		}
		/*
		 * 先将"\\'"转义成'&apos;'，将'\\"'转义成'&quot;'，即escapedSelector
		 * 在去掉一重':func()'时，如果使用了"'"，则将内部的'&apos;'解码成"'"；如果使用了'"'，则将内部的'&quot;'解码成'"'
		 */
		funcRegex.lastIndex = 0;
		const /** @type {Object<string, string[]>} */ calls = Object.fromEntries(func.map(f => [f, []])),
			selectors = escapedSelector.replace(funcRegex, (_, f, arg) => {
				const quotes = arg.match(/^(["']).*\1$/)?.[1];
				calls[f].push(quotes ? arg.slice(1, -1).replaceAll(escapedQuotes[quotes], quotes) : arg);
				return `:${f}(${calls[f].length - 1})`;
			}).split(','),
			parent = this.parent(),
			index = parent && this.index() + 1,
			indexOfType = parent && this.index(true) + 1,
			lastIndex = parent && this.lastIndex() + 1,
			lastIndexOfType = parent && this.lastIndex(true) + 1,
			content = parent && this.toString();
		return selectors.some(str => {
			const /** @type {Object<string, string[]>} */ curCalls = Object.fromEntries(func.map(f => [f, []]));
			funcRegex.lastIndex = 0;
			str = str.replace(funcRegex, (_, f, i) => {
				curCalls[f].push(calls[f][i]);
				return '';
			});
			return this.is(str)
				&& !curCalls.not.some(s => this.is(s))
				&& curCalls.has.every(s => this.has(s))
				&& curCalls.contains.every(s => content.includes(s))
				&& curCalls['nth-child'].every(s => nth(s, index))
				&& curCalls['nth-of-type'].every(s => nth(s, indexOfType))
				&& curCalls['nth-last-child'].every(s => nth(s, lastIndex))
				&& curCalls['nth-last-of-type'].every(s => nth(s, lastIndexOfType));
		});
	}

	/** @param {string|Token} selector */
	not(selector) {
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		}
		return !this.is(selector);
	}

	// ------------------------------ traversing ------------------------------ //

	/**
	 * @param {string|Token|undefined} selector
	 * @returns {?Token}
	 */
	parent(selector) {
		const parent = this.#parent;
		return parent?.is(selector) ? parent : null;
	}

	/**
	 * @param {string} selector
	 * @returns {?Token}
	 */
	closest(selector) {
		if (typeof selector !== 'string') {
			typeError('String');
		}
		let ancestor = this; // eslint-disable-line consistent-this
		while (ancestor) {
			if (ancestor.is(selector)) {
				return ancestor;
			}
			ancestor = ancestor.parent();
		}
		return null;
	}

	/** @param {string|Token|undefined} selector */
	parents(selector) {
		let ancestor = this.#parent;
		const $parents = Token.$.from();
		while (ancestor) {
			if (ancestor.is(selector)) {
				$parents.push(ancestor);
			}
			ancestor = ancestor.parent();
		}
		return $parents;
	}

	/** @param {string|Token} selector */
	parentsUntil(selector) {
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		}
		let ancestor = this.#parent;
		const $parents = Token.$.from();
		while (ancestor && !ancestor.is(selector)) {
			$parents.push(ancestor);
			ancestor = ancestor.parent();
		}
		return $parents;
	}

	even() {
		return this.$children.even();
	}

	odd() {
		return this.$children.odd();
	}

	/** @param {...number|string} args */
	eq(...args) {
		return this.$children.eq(...args);
	}

	/** @param {string|Token} selector */
	children(selector = '') {
		return Token.$.from(this.$children.filter(selector));
	}

	/**
	 * @param {string|number|Token} token
	 * @param {boolean} includingSelf
	 */
	contains(token, includingSelf) {
		token = numberToString(token);
		if (includingSelf && this === token) {
			return true;
		}
		return typeof token === 'string'
			? this.toString().includes(token)
			: this.children().some(child => child.contains(token, true));
	}

	/**
	 * 与TokenCollection.each方法统一，广度优先依次执行操作
	 * @param {...string|function(Token): void|number} args
	 * @param selector
	 * @param callback
	 * @param maxDepth - 0 表示当前层级
	 */
	each(...args) {
		let /** @type {string} */ selector,
			/** @type {function(Token): void|Promise<void>} */ callback,
			/** @type {number} */ maxDepth;
		if (args.length === 3) {
			[selector = '', callback, maxDepth = Infinity] = args;
		} else {
			selector = args.find(arg => typeof arg === 'string') ?? '';
			callback = args.find(arg => typeof arg === 'function');
			maxDepth = args.find(arg => typeof arg === 'number') ?? Infinity;
		}
		if (callback.constructor.name !== 'AsyncFunction') {
			if (this.is(selector)) {
				callback(this);
			}
			if (maxDepth >= 1) {
				this.$children.each(selector, callback, maxDepth - 1);
			}
			return this;
		}
		return (async () => {
			if (this.is(selector)) {
				await callback(this);
			}
			if (maxDepth >= 1) {
				await this.$children.each(selector, callback, maxDepth - 1);
			}
			return this;
		})();
	}

	/** 与TokenCollection.search方法统一，采取广度优先搜索  */
	descendants(selector = '', maxDepth = Infinity) {
		return this.$children.search(selector, maxDepth - 1);
	}

	/** @param {string|Token} selector */
	has(selector) {
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		}
		return this.descendants(selector).length > 0;
	}

	/** @param {boolean} ofType */
	index(ofType) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有父节点！');
		}
		return (ofType ? parent.children(this.type) : parent.$children).indexOf(this);
	}

	/** @param {boolean} ofType */
	lastIndex(ofType) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有父节点！');
		}
		const collection = ofType ? parent.children(this.type) : parent.$children;
		return collection.length - 1 - collection.indexOf(this);
	}

	/**
	 * @param {string|undefined} selector
	 * @returns {?string|Token}
	 */
	next(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			/** @type {?string|Token} */ sibling = $children[$children.indexOf(this) + 1] ?? null;
		return select(selector, sibling);
	}

	/**
	 * @param {string|undefined} selector
	 * @returns {?string|Token}
	 */
	prev(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			/** @type {?string|Token} */ sibling = $children[$children.indexOf(this) - 1] ?? null;
		return select(selector, sibling);
	}

	/** @param {string|undefined} selector */
	nextAll(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			/** @type {TokenCollection} */ $siblings = $children.slice($children.indexOf(this) + 1);
		return selects(selector, $siblings);
	}

	/** @param {string|undefined} selector */
	prevAll(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			/** @type {TokenCollection} */ $siblings = $children.slice(0, $children.indexOf(this));
		return selects(selector, $siblings);
	}

	/**
	 * @param {string|Token} selector
	 * @returns {TokenCollection}
	 */
	nextUntil(selector) {
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		} else if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			/** @type {TokenCollection} */ $siblings = $children.slice($children.indexOf(this) + 1),
			/** @type {number} */ index = $siblings.findIndex(token => token instanceof Token && token.is(selector));
		return index === -1 ? $siblings : $siblings.slice(0, index);
	}

	/**
	 * @param {string|Token} selector
	 * @returns {TokenCollection}
	 */
	prevUntil(selector) {
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		} else if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			/** @type {TokenCollection} */ $siblings = $children.slice(0, $children.indexOf(this)).reverse(),
			/** @type {number} */ index = $siblings.findIndex(token => token instanceof Token && token.is(selector));
		return index === -1 ? $siblings : $siblings.slice(0, index);
	}

	/** @param {string|undefined} selector */
	siblings(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			/** @type {TokenCollection} */ $siblings = $children.slice();
		$siblings.delete(this);
		return selects(selector, $siblings);
	}

	// ------------------------------ event handling ------------------------------ //

	/*
	 * 原生事件：
	 * childDetached(child, index)
	 * childReplaced(oldChild, newChild, index)
	 * parentRemoved(parent)
	 * parentReset(oldParent, newParent)
	 */

	/** @param {string} names */
	emit(names, ...args) {
		names.split(/\s/).forEach(name => {
			this.#events.emit(name, ...args);
		});
		return this;
	}

	trigger(...args) {
		return this.emit(...args);
	}

	/** @param {string} name */
	listeners(name) {
		return this.#events.listeners(name);
	}

	/**
	 * @param {string} names
	 * @param {function} listener
	 */
	on(names, listener) {
		names.split(/\s/).forEach(name => {
			this.#events.on(name, listener);
		});
		return this;
	}

	/**
	 * @param {string} names
	 * @param {function} listener
	 */
	once(names, listener) {
		names.split(/\s/).forEach(name => {
			this.#events.once(name, listener);
		});
		return this;
	}

	/**
	 * @param {string} name
	 * @param {function} listener
	 */
	off(name, listener) {
		this.#events.off(name, listener);
		return this;
	}

	// ------------------------------ tree manipulation ------------------------------ //

	/*
	 * 可能影响节点内部结构的方法：
	 * insert(args, i)
	 * delete(...args)
	 */

	/** 仅从父节点移除，保留父节点索引和子节点 */
	detach() {
		const parent = this.#parent;
		if (!parent) {
			throw new Error('不能删除根节点！');
		}
		const {$children} = parent,
			index = $children.indexOf(this);
		$children.splice(index, 1);
		parent.emit('childDetached', this, index);
		return this;
	}

	/** @param {...string|number} args */
	unremovableChild(...args) {
		if (externalUse()) {
			throw new Error('禁止外部调用Token.unremovableChild方法！');
		}
		const indices = new Ranges(args).applyTo(this.$children), // 依据执行时的长度
			{constructor: {name}, $children} = this;
		return this.on(
			'childDetached',
			/**
			 * @param {Token} child
			 * @param {number} i
			 */
			function unremovableChild(child, i) {
				if (indices.includes(i)) {
					$children.splice(i, 0, child);
					throw new Error(`unremovableChild: ${name}的第${i}个子节点不可移除！`);
				}
			},
		);
	}

	/** 既从父节点移除，也移除子节点的父索引，但保留自身的索引 */
	remove() {
		try {
			this.detach();
		} catch (e) {
			if (e.message.startsWith('unremovableChild')) {
				return this;
			}
		}
		this.children().forEach(token => {
			token.removeParent();
		});
		return this;
	}

	/** @param {string|Token} token */
	verifyChild(token) {
		if (externalUse()) {
			Token.warn(false, 'Token.verifyChild方法一般不应直接调用，仅用于代码调试！');
		}
		const result = this.#acceptable
			? this.#acceptable.includes(token.constructor.name)
				&& (typeof token === 'string' || !token.contains(this, true))
			: typeof token === 'string' || token instanceof Token && !token.contains(this, true);
		if (result === false) {
			Token.debug('verifyChild', {acceptable: this.#acceptable, constructor: token.constructor.name});
		}
		return result;
	}

	/** @param {string|number|Token|(string|number|Token)[]} args */
	insert(args, i = this.$children.length) {
		if (typeof i !== 'number') {
			typeError('Number');
		}
		i = Math.min(Math.max(i, 0), this.$children.length);
		args = (Array.isArray(args) ? args : [args]).map(numberToString);
		const $legalArgs = Token.$(args.filter(arg => this.verifyChild(arg)));
		if ($legalArgs.length < args.length) {
			Token.error('Token.prepend: 部分节点未插入！');
		}
		this.$children.splice(i, 0, ...$legalArgs);
		$legalArgs.filterTokens().forEach(token => {
			token.resetParent(this);
			token.type = token.type === 'root' ? 'plain' : token.type;
		});
		return this;
	}

	/** @param {...string|number|Token} args */
	append(...args) {
		return this.insert(args);
	}

	/** @param {...string|number|Token} args */
	prepend(...args) {
		return this.insert(args, 0);
	}

	/** @param {...number|string|Token} args */
	delete(...args) {
		const /** @type {Token[]} */ tokens = args.filter(token => token instanceof Token),
			indices = new Ranges(args.filter(i => ['number', 'string'].includes(typeof i)))
				.applyTo(this.$children).reverse();
		indices.forEach(i => { // 倒序删除，且必须在删除指定Token之前
			const [token] = this.$children.splice(i, 1);
			if (token instanceof Token) {
				token.removeParent();
			}
		});
		tokens.forEach(token => {
			if (this.$children.includes(token)) {
				this.$children.delete(token);
				token.removeParent();
			}
		});
		return this;
	}

	/** @param {string|number|Token|(string|number|Token)[]} children */
	content(children) {
		children = (Array.isArray(children) ? children : [children]).map(numberToString);
		if (!children.every(tokenLike)) {
			typeError('String', 'Number', 'Token');
		}
		this.children().detach(); // 移除节点
		this.$children.length = 0; // 移除剩下的字符串
		return this.append(...children);
	}

	/** @param {Token|string} token */
	replaceWith(token) {
		const parent = this.#parent;
		if (!parent) {
			throw new RangeError('不能替换根节点！');
		}
		if (this === token) {
			return this;
		} else if (!parent.verifyChild(token)) {
			throw new TypeError('替换的新节点非法！');
		} else if (token instanceof Token && token.contains(parent, true)) {
			throw new RangeError('替换后将出现循环结构！');
		}
		const {$children} = parent,
			index = $children.indexOf(this);
		$children[index] = token;
		parent.emit('childReplaced', this, token, index);
		if (token instanceof Token) {
			token.resetParent(parent);
		}
		return this;
	}

	keepChildrenOrder() {
		if (externalUse()) {
			throw new Error('禁止外部调用Token.keepChildrenOrder方法！');
		}
		const {constructor: {name}, $children} = this;
		return this.on(
			'childReplaced',
			/**
			 * @param {Token} oldChild
			 * @param {Token|string} newChild
			 * @param {number} i
			 */
			function keepChildrenOrder(oldChild, newChild, i) {
				if (oldChild.constructor.name !== newChild.constructor.name) {
					$children.splice(i, 1, oldChild);
					throw new Error(`keepChildrenOrder: ${name}的子节点必须保持固定顺序！`);
				}
				const /** @type {?string[]} */ oldAc = oldChild.get('acceptable'),
					/** @type {?string[]} */ newAc = newChild.get('acceptable'),
					eq = oldAc === null
						? newAc === null
						: oldAc.length === newAc?.length && oldAc.every(ele => newAc.includes(ele));
				if (!eq) {
					$children.splice(i, 1, oldChild);
					throw new Error('替换前后的子节点必须保持相同的#acceptable属性！');
				}
			},
		);
	}

	// ------------------------------ wikitext specifics ------------------------------ //

	/**
	 * 引自mediawiki.Title::parse
	 * @param {string} title
	 */
	normalizeTitle(title, defaultNs = 0) {
		if (typeof title !== 'string') {
			typeError('String');
		} else if (typeof defaultNs !== 'number') {
			typeError('Number');
		}
		const {namespaces, nsid} = this.#config;
		let /** @type {string} */ namespace = namespaces[defaultNs];
		title = title.replaceAll('_', ' ').trim();
		if (title[0] === ':') {
			namespace = '';
			title = title.slice(1).trim();
		}
		const m = title.split(':');
		if (m.length > 1) {
			const /** @type {string} */ id = namespaces[nsid[m[0].trim().toLowerCase()]];
			if (id) {
				namespace = id;
				title = m.slice(1).join(':').trim();
			}
		}
		const i = title.indexOf('#');
		title = i === -1 ? title : title.slice(0, i).trim();
		return `${namespace}${namespace && ':'}${title && `${title[0].toUpperCase()}${title.slice(1)}`}`;
	}

	/**
	 * @param {string} title
	 * @param {number|undefined} defaultNs
	 */
	static normalizeTitle(title, defaultNs, config) {
		return new Token(null, config).normalizeTitle(title, defaultNs);
	}

	/**
	 * @param {boolean} force
	 * @returns {TokenCollection[]|undefined}
	 */
	sections(force) {
		if (this.type !== 'root') {
			return;
		}
		if (force || !this.#sections) {
			const {$children} = this,
				/** @type {number[][]} */ headings = $children.filter('heading')
					.map(heading => [$children.indexOf(heading), Number(heading.name)]),
				/** @type {number[]} */ lastHeading = new Array(6).fill(-1);
			this.#sections = new Array(headings.length);
			headings.forEach(([index, level], i) => {
				for (let j = level; j < 6; j++) {
					const last = lastHeading[j];
					if (last >= 0) {
						this.#sections[last] = $children.slice(headings[last][0], index);
					}
					lastHeading[j] = j === level ? i : -1;
				}
			});
			lastHeading.filter(last => last >= 0).forEach(last => {
				this.#sections[last] = $children.slice(headings[last][0]);
			});
			this.#sections.unshift($children.slice(0, headings[0]?.[0]));
		}
		return this.#sections;
	}

	/**
	 * @param {number} n
	 * @param {boolean} force
	 */
	section(n, force) {
		if (typeof n !== 'number') {
			typeError('Number');
		}
		return this.sections(force)[n];
	}

	comment() {
		const CommentToken = require('./commentToken');
		const comment = new CommentToken(this, true); // CommentToken只包含字符串，所以this不是comment的child
		return this.replaceWith(comment);
	}

	nowiki() {
		const ExtToken = require('./extToken');
		const nowiki = new ExtToken('nowiki', '', `${this.toString()}</nowiki>`, this.#config);
		return this.replaceWith(nowiki);
	}

	// ------------------------------ parsing and building ------------------------------ //

	parseOnce(n = this.#stage) {
		if (externalUse()) {
			Token.warn(false, 'Token.parseOnce方法一般不应直接调用，仅用于代码调试！');
		}
		if (typeof n !== 'number') {
			typeError('Number');
		} else if (n < this.#stage || !this.isPlain()) {
			return;
		} else if (n > this.#stage) {
			throw new RangeError(`当前解析层级为${this.#stage}！`);
		}
		const {type, $children} = this;
		switch (n) {
			case 0: {
				if (type === 'root') {
					this.#accum.shift();
				}
				const regex = new RegExp(
					`<!--.*?(?:-->|$)|<(${this.#config.ext.join('|')})(\\s.*?)?(/>|>.*?</\\1>)`,
					'gis',
				);
				$children[0] = $children[0].replace(regex, (substr, name, attr = '', inner = '') => {
					const str = `\x00${this.#accum.length}${name ? 'e' : 'c'}\x7f`;
					if (name) {
						const ExtToken = require('./extToken'),
							selfClosing = inner === '/>';
						new ExtToken(name, attr, selfClosing || inner.slice(1), this.#config, this.#accum);
					} else {
						const CommentToken = require('./commentToken'),
							closed = substr.endsWith('-->');
						new CommentToken(substr.slice(4, closed ? -3 : undefined), closed, this.#accum);
					}
					return str;
				});
				break;
			}
			case 1: {
				const source = '(?<=^(?:\x00\\d+c\x7f)*)={1,6}|\\[\\[|{{2,}|-{(?!{)',
					stack = [],
					closes = {'=': '\n', '{': '}{2,}|\\|', '-': '}-', '[': ']]'};
				let /** @type {[string]} */ [text] = this,
					regex = new RegExp(source, 'gm'),
					mt = regex.exec(text),
					moreBraces = text.includes('}}'),
					/** @type {number} */ lastIndex;
				while (mt || lastIndex <= text.length && stack.at(-1)?.[0]?.[0] === '=') {
					const {0: syntax, index: curIndex} = mt ?? {0: '\n', index: text.length},
						/** @type {RegExpExecArray} */ top = stack.pop(),
						{0: open, index, parts} = top ?? {},
						/** @type {boolean} */ innerEqual = syntax === '=' && top?.findEqual;
					if ([']]', '}-'].includes(syntax)) { // 情形1：闭合内链或转换
						lastIndex = curIndex + 2;
					} else if (syntax === '\n') { // 情形2：闭合标题
						lastIndex = curIndex + 1;
						const {pos, findEqual} = stack.at(-1) ?? {};
						if (!pos || findEqual || removeComment(text.slice(pos, index)) !== '') {
							const rmt = text.slice(index, curIndex)
								.match(/^(={1,6})(.+)\1((?:\s|\x00\d+c\x7f)*)$/);
							if (rmt) {
								text = `${text.slice(0, index)}\x00${this.#accum.length}h\x7f${text.slice(curIndex)}`;
								lastIndex = index + 4 + String(this.#accum.length).length;
								const HeadingToken = require('./headingToken');
								new HeadingToken(rmt[1].length, rmt.slice(2), this.#config, this.#accum);
							}
						}
					} else if (syntax === '|' || innerEqual) { // 情形3：模板内部，含行首单个'='
						lastIndex = curIndex + 1;
						parts.at(-1).push(text.slice(top.pos, curIndex));
						if (syntax === '|') {
							parts.push([]);
						}
						top.pos = lastIndex;
						top.findEqual = syntax === '|';
						stack.push(top);
					} else if (syntax.startsWith('}}')) { // 情形4：闭合模板
						const close = syntax.slice(0, Math.min(open.length, 3)),
							rest = open.length - close.length,
							{length} = this.#accum;
						lastIndex = curIndex + close.length; // 这不是最终的lastIndex
						parts.at(-1).push(text.slice(top.pos, curIndex));
						/* 标记{{!}} */
						const ch = close.length === 2 && removeComment(parts[0][0]) === '!' ? '!' : 't';
						let skip = false;
						if (close.length === 3) {
							const ArgToken = require('./argToken');
							new ArgToken(parts.map(part => part.join('=')), this.#config, this.#accum);
						} else {
							try {
								const TranscludeToken = require('./transcludeToken');
								new TranscludeToken(parts[0][0], parts.slice(1), this.#config, this.#accum);
							} catch (e) {
								if (e.message.startsWith('非法的模板名称：')) {
									lastIndex = index + open.length;
									skip = true;
									continue;
								}
								throw e;
							}
						}
						if (!skip) {
							/* 标记{{!}}结束 */
							text = `${text.slice(0, index + rest)}\x00${length}${ch}\x7f${text.slice(lastIndex)}`;
							lastIndex = index + rest + 3 + String(this.#accum.length - 1).length;
							if (rest > 1) {
								stack.push({0: open.slice(0, rest), index, pos: index + rest, parts: [[]]});
							} else if (rest === 1 && text[index - 1] === '-') {
								stack.push({0: '-{', index: index - 1, pos: index + 1, parts: [[]]});
							}
						}
					} else { // 情形5：开启
						lastIndex = curIndex + syntax.length;
						if (top) {
							stack.push(top);
						}
						if (syntax[0] === '{') {
							mt.pos = lastIndex;
							mt.parts = [[]];
						}
						stack.push(mt);
					}
					moreBraces &&= text.slice(lastIndex).includes('}}');
					let curTop = stack.at(-1);
					if (!moreBraces && curTop?.[0]?.[0] === '{') {
						stack.pop();
						curTop = stack.at(-1);
					}
					regex = new RegExp(source + (curTop
						? `|${closes[curTop[0][0]]}${curTop.findEqual ? '|=' : ''}`
						: ''
					), 'gm');
					regex.lastIndex = lastIndex;
					mt = regex.exec(text);
				}
				this.$children[0] = text;
				break;
			}
			case 2:
				break;
			case 3:
				break;
			case 4:
				break;
			case 5:
				break;
			case 6:
				break;
			case 7:
				break;
			case 8:
				break;
			case 9:
				break;
			case 10:
				break;
			case 11:
				return;
			default:
				throw new RangeError('解析层级应为0～10的整数！');
		}
		if (type === 'root') {
			for (const token of this.#accum) {
				token.parseOnce(n);
			}
		}
		this.#stage++;
		return this;
	}

	/**
	 * @param {string} str
	 * @param {function(Token): void|undefined} callback
	 */
	buildOnce(str, callback) {
		if (externalUse()) {
			Token.warn(false, 'Token.buildOnce方法一般不应直接调用，仅用于代码调试！');
		}
		return Token.$(str.split(/[\x00\x7f]/).map((s, i) => {
			if (i % 2 === 0) {
				return s;
			}
			const /** @type {Token} */ token = this.#accum[s.slice(0, -1)];
			if (typeof callback === 'function') {
				callback(token);
			}
			return token;
		}));
	}

	build() {
		if (externalUse()) {
			Token.warn(false, 'Token.build方法一般不应直接调用，仅用于代码调试！');
		}
		this.#stage = MAX_STAGE;
		const {$children, type} = this;
		if ($children.length !== 1 || typeof $children[0] !== 'string' || !$children[0].includes('\x00')) {
			return this;
		}
		const /** @type {string} */ text = $children.pop();
		$children.push(...this.buildOnce(text, token => {
			token.set('parent', this);
		}).filter(str => str !== ''));
		if ($children.length === 0) {
			$children.push('');
		}
		if (type === 'root') {
			for (const token of this.#accum) {
				token.build();
			}
		}
		return this;
	}

	/**
	 * @param {number|true} n
	 * @returns {this}
	 */
	parse(n = MAX_STAGE) {
		if (n === true) {
			return this.each('arg, template, parameter', token => {
				if (token.name) { // 匿名参数已经获得了name属性
					return;
				}
				const name = removeComment(token.$children[0].toString());
				token.name = token.type === 'template' ? token.normalizeTitle(name, 10) : name;
			});
		}
		if (typeof n !== 'number') {
			typeError('Number');
		} else if (n < MAX_STAGE && externalUse()) {
			Token.warn(false, '指定解析层级的方法仅供熟练用户使用！');
		}
		while (this.#stage < n) {
			this.parseOnce(this.#stage);
		}
		return this.build().parse(true);
	}

	/**
	 * @param {?string|number|Token|(string|Token)[]} wikitext
	 * @param {number|undefined} n
	 * @param {Object<string, any>|undefined} config
	 */
	static parse(wikitext, n, config) {
		if (wikitext instanceof Token) {
			return wikitext.parse(n);
		}
		return new Token(wikitext, config).parse(n);
	}
}

module.exports = Token;
