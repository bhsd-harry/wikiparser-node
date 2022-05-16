'use strict';
/**
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

/**
 * \x00\d+.\x7f标记Token：
 * e: ExtToken
 * c: CommentToken
 * !: {{!}}专用
 * t: ArgToken或TranscludeToken
 * h: HeadingToken
 */

/* eslint func-names: [2, "as-needed"], prefer-arrow-callback: [2, {allowNamedFunctions: true}] */
/* eslint-disable no-control-regex, no-new, no-param-reassign */
const EventEmitter = require('events'),
	{$, numberToString, typeError} = require('./tokenCollection');

const MAX_STAGE = 11;
const removeComment = (str, trimming = true) => {
		str = str.replace(/<!--.*?-->|\x00\d+c\x7f/g, '');
		return trimming ? str.trim() : str;
	},
	caller = () => {
		try {
			throw new Error();
		} catch ({stack}) {
			const mt = stack.match(/(?<=^\s+at )[\w.]+(?= \((?!<anonymous>))/gm);
			return mt.slice(1, 3);
		}
	},
	select = (selector, token) =>
		selector === undefined || token instanceof Token && token.is(selector) ? token : null,
	selects = (selector, $tokens) =>
		selector === undefined ? $tokens : $tokens.filter(token => token instanceof Token && token.is(selector)),
	updateToken = (token, str) => {
		let isCollection = str instanceof $.class;
		if (!isCollection) {
			str = numberToString(str);
		} else if (str.every(ele => typeof ele === 'string')) {
			str = str.toString();
			isCollection = false;
		}
		if (!isCollection && typeof str !== 'string' && !(str instanceof Token)) {
			typeError('String', 'Number', 'Token', 'TokenCollection');
		}
		token.children().detach(); // 移除节点
		token.$children.length = 0; // 移除剩下的字符串
		return isCollection ? token.append(...str) : token.append(str);
	},
	buildOnce = (str, accum, callback) => $(str.split(/[\x00\x7f]/).map((s, i) => {
		if (i % 2 === 0) {
			return s;
		}
		const token = accum[s.slice(0, -1)];
		if (typeof callback === 'function') {
			callback(token);
		}
		return token;
	}));

/**
 * @children {Array.<string|Token>}
 * @param {?(string|number|Token|Array.<string|Token>)} wikitext
 * @param {object} config
 * @param {boolean} halfParsed
 * @param {?Token} parent
 * @param {Token[]} accum
 * @param {?string[]} acceptable
 */
class Token {
	type = 'root';
	$children; /** @type {TokenCollection} */
	#i = 0; /** @type {number} */
	#stage = 0; // 解析阶段，参见顶部注释
	#events = new EventEmitter();
	#config; /** @type {object} */
	#parent; /** @type {?Token} */
	#accum; /** @type {Token[]} */
	#acceptable; /** @type {?string[]} */
	#sections; /** @type {TokenCollection} */

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
			this.$children = $();
		} else if (typeof wikitext === 'string') {
			this.$children = $(halfParsed ? wikitext : wikitext.replace(/[\x00\x7f]/g, ''));
		} else if (wikitext instanceof Token) {
			this.$children = $(wikitext);
			wikitext.set('parent', this);
		} else if (Array.isArray(wikitext)) {
			this.$children = $(wikitext.map(numberToString).filter(ele => {
				if (ele instanceof Token) {
					ele.set('parent', this);
					return true;
				} else if (typeof ele === 'string') {
					return true;
				}
				return false;
			}));
		} else {
			typeError('String', 'Number', 'Array', 'Token');
		}
		if (parent && !parent.verifyChild(this)) {
			throw new RangeError('指定的父节点非法！');
		}
		this.#config = config;
		this.#parent = parent;
		parent?.$children?.push(this);
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

	/**
	 * @param {string} key
	 * @returns {any}
	 */
	get(key) {
		if (typeof key !== 'string') {
			typeError('String');
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

	/**
	 * @param {string} key
	 * @param {any} value
	 */
	set(key, value) {
		if (typeof key !== 'string') {
			typeError('String');
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

	/** @returns {boolean} */
	isPlain() {
		return this.constructor.name === 'Token';
	}

	resetParent(token) {
		const [callee, thisCaller] = caller();
		if (thisCaller !== 'TokenCollection.forEach' && !thisCaller.endsWith('Token.replaceWith')) {
			Token.warn(false, 'Token.resetParent方法一般不应直接调用，仅用于代码调试！');
			Token.debug('caller', {callee, caller: thisCaller});
		}
		const parent = this.#parent;
		this.set('parent', token).emit('parentReset', parent, token);
	}

	removeParent() {
		const parent = this.#parent;
		this.set('parent', null).emit('parentRemoved', parent);
	}

	freeze(keys) {
		keys = typeof keys === 'string' ? [keys] : keys;
		keys.forEach(key => {
			Object.defineProperty(this, key, {writable: false, configurable: false});
		});
		return this;
	}

	// ------------------------------ extended superclass ------------------------------ //

	/** @returns {string} */
	toString() {
		return this.$children.toString();
	}

	/** @returns {string} */
	text() {
		return this.toString();
	}

	// ------------------------------ parsing before completion ------------------------------ //

	/** @param {number} n */
	parseOnce(n = this.#stage) {
		const [callee, thisCaller] = caller();
		if (!['Token.parseOnce', 'Token.parse'].includes(thisCaller)) {
			Token.warn(false, 'Token.parseOnce方法一般不应直接调用，仅用于代码调试！');
			Token.debug('caller', {callee, caller: thisCaller});
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
						new ExtToken([name, attr, inner.slice(1)], this.#config, this.#accum);
					} else {
						new CommentToken(substr.slice(4), this.#accum);
					}
					return str;
				});
				break;
			}
			case 1: {
				const source = '(?<=^(?:\x00\\d+c\x7f)*)={1,6}|\\[\\[|{{2,}|-{(?!{)',
					stack = [],
					closes = {'=': '\n', '{': '}{2,}|\\|', '-': '}-', '[': ']]'};
				let [text] = this,
					regex = new RegExp(source, 'gm'),
					mt = regex.exec(text),
					moreBraces = text.includes('}}'),
					lastIndex;
				while (mt || lastIndex <= text.length && stack.at(-1)?.[0]?.[0] === '=') {
					const {0: syntax, index: curIndex} = mt ?? {0: '\n', index: text.length},
						top = stack.pop(),
						{0: open, index, parts} = top ?? {},
						innerEqual = syntax === '=' && top?.findEqual;
					if ([']]', '}-'].includes(syntax)) { // 情形1：闭合内链或转换
						lastIndex = curIndex + 2;
					} else if (syntax === '\n') { // 情形2：闭合标题
						lastIndex = curIndex + 1;
						const {pos, findEqual} = stack.at(-1) ?? {};
						if (!pos || findEqual || removeComment(text.slice(pos, index)) !== '') {
							const rmt = text.slice(index, curIndex)
								.match(/^(={1,6})(.+)\1((?:\s|\x00\d+c\x7f)*)$/);
							if (rmt) {
								text = `${text.slice(0, index)}\x00${
									this.#accum.length
								}h\x7f${text.slice(curIndex)}`;
								lastIndex = index + 4 + String(this.#accum.length).length;
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
							new ArgToken(parts, this.#config, this.#accum);
						} else {
							try {
								new TranscludeToken(parts, this.#config, this.#accum);
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

	build() {
		const [callee, thisCaller] = caller(),
			{$children, type} = this;
		if (thisCaller !== 'Token.parse' && !thisCaller.endsWith('Token.build')) {
			Token.warn(false, 'Token.build方法一般不应直接调用，仅用于代码调试！');
			Token.debug('caller', {callee, caller: thisCaller});
		}
		this.#stage = MAX_STAGE;
		if (!this.isPlain() && !(this instanceof AtomToken) || !$children[0].includes('\x00')) {
			return this;
		}
		const text = $children.pop();
		$children.push(...buildOnce(text, this.#accum, token => {
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

	/** @param {number|true} n */
	parse(n = MAX_STAGE) {
		if (n === true) {
			return this.each('arg, template, parameter', token => {
				if (token.name) { // 匿名参数
					return;
				}
				const name = removeComment(token.$children[0].toString());
				token.name = token.type === 'template' ? token.normalize(name, 10) : name;
			});
		}
		if (typeof n !== 'number') {
			typeError('Number');
		} else if (n < MAX_STAGE) {
			const [callee, thisCaller] = caller();
			if (![
				'ArgToken.rename', 'ArgToken.setDefault',
				'TranscludeToken.newAnonArg', 'TranscludeToken.setValue',
				'ParameterToken.setValue',
			].includes(thisCaller)) {
				Token.warn(false, '指定解析层级的方法仅供熟练用户使用！');
				Token.debug('caller', {callee, caller: thisCaller});
			}
		}
		while (this.#stage < n) {
			this.parseOnce(this.#stage);
		}
		return this.build().parse(true);
	}

	// ------------------------------ selector basics ------------------------------ //

	/**
	 * @param {string} key
	 * @param {?string} equal
	 * @param {?string} val
	 * @param {?string} i
	 * @returns {boolean}
	 */
	isAttr(key, equal, val, i) {
		const [callee, thisCaller] = caller();
		if (!thisCaller.endsWith('Token.is')) {
			Token.debug('caller', {callee, caller: thisCaller});
			throw new Error('禁止外部调用Token.isAttr方法！');
		}
		const thisVal = i ? String(this[key]).toLowerCase() : String(this[key]);
		switch (equal) {
			case '=':
				return key in this && thisVal === val;
			case '~=':
				return typeof this[key] !== 'string' // string也是iterable，但显然不符合意图
					&& this[key]?.[Symbol.iterator] && [...this[key]].some(v => String(v) === val);
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
			default:
				return Boolean(this[key]);
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
			const attributes = [];
			selector = selector.replaceAll('&comma;', ',').replace(
				/\[\s*(\w+)\s*(?:([~|^$*!]?=)\s*("[^"]*"|'[^']*'|[^[\]]*?)\s*( i)?)?]/g,
				(_, key, equal, val, i) => {
					if (equal) {
						val = i ? val.toLowerCase() : val;
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
			);
			const [type, ...parts] = selector.trim().split('#'),
				name = parts.join('#');
			return (!type || this.type === type) && (!name || this.name === name)
				&& attributes.every(args => this.isAttr(...args));
		}
		/**
		 * 先将"\\'"转义成'&apos;'，将'\\"'转义成'&quot;'，即escapedSelector
		 * 在去掉一重':func()'时，如果使用了"'"，则将内部的'&apos;'解码成"'"；如果使用了'"'，则将内部的'&quot;'解码成'"'
		 */
		const calls = Object.fromEntries(func.map(f => [f, []]));
		funcRegex.lastIndex = 0;
		const selectors = escapedSelector.replace(funcRegex, (_, f, arg) => {
			const quotes = arg.match(/^(["']).*\1$/)?.[1];
			calls[f].push(quotes ? arg.slice(1, -1).replaceAll(escapedQuotes[quotes], quotes) : arg);
			return `:${f}(${calls[f].length - 1})`;
		}).split(',');
		const nth = (str, i) => {
			if (i === null) {
				return false;
			}
			const values = [String(i), i % 2 ? 'odd' : 'even'];
			return str.split(',').some(s => {
				s = s.trim();
				if (!s.includes(':')) {
					return values.includes(s);
				}
				let [start, end, step = 1] = s.split(':');
				start = Number(start);
				end = Number(end || Infinity);
				step = Math.max(Number(step), 1);
				return start <= i && end > i && (i - start) % step === 0;
			});
		};
		const parent = this.parent(),
			index = parent && this.index() + 1,
			indexOfType = parent && this.index(true) + 1,
			lastIndex = parent && this.lastIndex() + 1,
			lastIndexOfType = parent && this.lastIndex(true) + 1,
			content = parent && this.toString();
		return selectors.some(str => {
			const curCalls = Object.fromEntries(func.map(f => [f, []]));
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

	// ------------------------------ traversing ------------------------------ //

	/**
	 * @param {?(string|Token)} selector
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

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	parents(selector) {
		let ancestor = this.#parent;
		const $parents = $();
		while (ancestor) {
			if (ancestor.is(selector)) {
				$parents.push(ancestor);
			}
			ancestor = ancestor.parent();
		}
		return $parents;
	}

	/**
	 * @param {string|Token} selector
	 * @returns {TokenCollection}
	 */
	parentsUntil(selector) {
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		}
		let ancestor = this.#parent;
		const $parents = $();
		while (ancestor && !ancestor.is(selector)) {
			$parents.push(ancestor);
			ancestor = ancestor.parent();
		}
		return $parents;
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 */
	children(selector = '') {
		return this.$children.filter(selector);
	}

	/**
	 * @param {string|number|Token} token
	 * @param {boolean} includingSelf
	 * @returns {boolean}
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
	 * 与TokenCollection.each方法统一，采取广度优先搜索
	 * @param {string} selector
	 * @param {function(Token)} callback
	 * @param {number} maxDepth - 0 表示当前层级
	 */
	each(...args) {
		const selector = args.find(arg => typeof arg === 'string') ?? '',
			callback = args.find(arg => typeof arg === 'function'),
			maxDepth = args.find(arg => typeof arg === 'number') ?? Infinity;
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
			if (maxDepth > 0) {
				await this.$children.each(selector, callback, maxDepth - 1);
			}
			return this;
		})();
	}

	/**
	 * 与TokenCollection.each方法统一，采取广度优先搜索
	 * @param {?string} selector
	 * @param {number} maxDepth
	 * @returns {TokenCollection}
	 */
	search(selector, maxDepth = Infinity) {
		return this.$children.search(selector, maxDepth - 1);
	}

	/**
	 * @param {?string} selector
	 * @returns {boolean}
	 */
	has(selector) {
		return this.search(selector).length > 0;
	}

	/**
	 * @param {boolean} ofType
	 * @returns {number}
	 * @throws Error
	 */
	index(ofType) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有父节点！');
		}
		return (ofType ? parent.children(this.type) : parent.$children).indexOf(this);
	}

	/**
	 * @param {boolean} ofType
	 * @returns {number}
	 * @throws Error
	 */
	lastIndex(ofType) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有父节点！');
		}
		const collection = ofType ? parent.children(this.type) : parent.$children;
		return collection.length - 1 - collection.indexOf(this);
	}

	/**
	 * @param {?string} selector
	 * @returns {?(string|Token)}
	 * @throws Error
	 */
	next(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent;
		const sibling = $children[$children.indexOf(this) + 1] ?? null;
		return select(selector, sibling);
	}

	/**
	 * @param {?string} selector
	 * @returns {?(string|Token)}
	 * @throws Error
	 */
	prev(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent;
		const sibling = $children[$children.indexOf(this) - 1] ?? null;
		return select(selector, sibling);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 * @throws Error
	 */
	nextAll(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			$siblings = $children.slice($children.indexOf(this) + 1);
		return selects(selector, $siblings);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 * @throws Error
	 */
	prevAll(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			$siblings = $children.slice(0, $children.indexOf(this));
		return selects(selector, $siblings);
	}

	/**
	 * @param {string|Token} selector
	 * @returns {TokenCollection}
	 * @throws Error
	 */
	nextUntil(selector) {
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		}
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			$siblings = $children.slice($children.indexOf(this) + 1),
			index = $siblings.findIndex(token => token instanceof Token && token.is(selector));
		return index === -1 ? $siblings : $siblings.slice(0, index);
	}

	/**
	 * @param {string|Token} selector
	 * @returns {TokenCollection}
	 * @throws Error
	 */
	prevUntil(selector) {
		if (typeof selector !== 'string' && !(selector instanceof Token)) {
			typeError('String', 'Token');
		}
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			$siblings = $children.slice(0, $children.indexOf(this)).reverse(),
			index = $siblings.findIndex(token => token instanceof Token && token.is(selector));
		return index === -1 ? $siblings : $siblings.slice(0, index);
	}

	/**
	 * @param {?string} selector
	 * @returns {TokenCollection}
	 * @throws Error
	 */
	siblings(selector) {
		if (this.#parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const {$children} = this.#parent,
			$siblings = $children.slice();
		$siblings.delete(this);
		return selects(selector, $siblings);
	}

	// ------------------------------ event handling ------------------------------ //

	/**
	 * 原生事件：
	 * childDetached(child, index)
	 * childReplaced(oldChild, newChild, index)
	 * parentRemoved(parent)
	 * parentReset(oldParent, newParent)
	 */

	/**
	 * @param {string} name
	 * @param {any}
	 */
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

	// ------------------------------ manipulation ------------------------------ //

	/**
	 * 可能影响节点内部结构的方法：
	 * insert(args, i)
	 * delete(...args)
	 */

	/**
	 * 仅从父节点移除，保留父节点索引和子节点
	 * @throws Error
	 */
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

	unremovableChild(...args) {
		const {constructor: {name}, $children} = this;
		return this.on('childDetached', function unremovableChild(child, i) {
			if (args.includes(i)) {
				$children.splice(i, 0, child);
				throw new Error(`unremovableChild: ${name}的第${i}个子节点不可移除！`);
			}
		});
	}

	/**
	 * 既从父节点移除，也移除子节点的父索引，但保留自身的索引
	 */
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

	verifyChild(token) {
		const result = this.#acceptable
			? this.#acceptable.includes(token.constructor.name)
				&& (typeof token === 'string' || !token.contains(this, true))
			: typeof token === 'string' || token instanceof Token && !token.contains(this, true);
		if (result === false) {
			Token.debug('verifyChild', {acceptable: this.#acceptable, constructor: token.constructor.name});
		}
		return result;
	}

	/**
	 * @param {Array.<string|number|Token>|TokenCollection} args
	 * @param {number} i
	 */
	insert(args, i = this.$children.length) {
		if (typeof i !== 'number') {
			typeError('Number');
		}
		i = Math.min(Math.max(i, 0), this.$children.length);
		args = (Array.isArray(args) ? args : [args]).map(numberToString);
		const $legalArgs = $(args.filter(arg => this.verifyChild(arg)));
		if ($legalArgs.length < args.length) {
			Token.error('Token.prepend: 部分节点未插入！');
		}
		this.$children.splice(i, 0, ...$legalArgs);
		$legalArgs.filterTokens().forEach(token => {
			token.resetParent(this);
			if (token.type === 'root') {
				token.type = 'plain';
			}
		});
		return this;
	}

	/** @param {string|number|Token} */
	append(...args) {
		return this.insert(args);
	}

	/** @param {string|number|Token} */
	prepend(...args) {
		return this.insert(args, 0);
	}

	/** @param {number|Token} */
	delete(...args) {
		const tokens = args.filter(token => token instanceof Token),
			numbers = args.filter(i => typeof i === 'number');
		if (tokens.length + numbers.length < args.length) {
			typeError('Number', 'Token');
		}
		tokens.forEach(token => {
			this.$children.delete(token);
			token.removeParent();
		});
		numbers.sort((a, b) => b - a).forEach(arg => { // 倒序删除，且必须在删除已知Token之后
			const [token] = this.$children.splice(arg, 1);
			token.removeParent();
		});
		return this;
	}

	/**
	 * @param {Token|string} token
	 * @throws RangeError
	 */
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
		const {constructor: {name}, $children} = this;
		return this.on('childReplaced', function keepChildrenOrder(oldChild, newChild, i) {
			if (oldChild.constructor.name !== newChild.constructor.name) {
				$children.splice(i, 1, oldChild);
				throw new Error(`keepChildrenOrder: ${name}的子节点必须保持固定顺序！`);
			} else if (typeof oldChild === 'string') {
				return;
			}
			const oldAc = oldChild.get('acceptable'),
				newAc = newChild.get('acceptable'),
				eq = oldAc === null
					? newAc === null
					: oldAc.length === newAc?.length && oldAc.every(ele => newAc.includes(ele));
			if (!eq) {
				$children.splice(i, 1, oldChild);
				throw new Error('替换前后的子节点必须保持相同的#acceptable属性！');
			}
		});
	}

	sealChildren() {
		/* eslint-disable func-names */
		this.insert = function() {
			throw new Error(`${this.constructor.name}不可插入元素！`);
		};
		this.delete = function() {
			throw new Error(`${this.constructor.name}不可删除元素！`);
		};
		/* eslint-enable func-names */
		return this.keepChildrenOrder().unremovableChild(...this.$children.map((_, i) => i));
	}

	// ------------------------------ wikitext specifics ------------------------------ //

	/**
	 * 引自mediawiki.Title::parse
	 * @param {string} title
	 * @param {number} defaultNs
	 * @returns {string}
	 */
	normalize(title, defaultNs = 0) {
		if (typeof title !== 'string') {
			typeError('String');
		} else if (typeof defaultNs !== 'number') {
			typeError('Number');
		}
		const {namespaces, nsid} = this.#config;
		let namespace = namespaces[defaultNs];
		title = title.replaceAll('_', ' ').trim();
		if (title[0] === ':') {
			namespace = '';
			title = title.slice(1).trim();
		}
		const m = title.split(':');
		if (m.length > 1) {
			const id = namespaces[nsid[m[0].trim().toLowerCase()]];
			if (id) {
				namespace = id;
				title = m.slice(1).join(':').trim();
			}
		}
		const i = title.indexOf('#');
		title = i === -1 ? title : title.slice(0, i).trim();
		return `${namespace}${namespace && ':'}${
			title && `${title[0].toUpperCase()}${title.slice(1)}`.replaceAll('_', ' ')
		}`;
	}

	/**
	 * @param {boolean} force
	 * @returns {TokenCollection[]}
	 */
	sections(force) {
		if (this.type !== 'root') {
			return;
		}
		if (force || !this.#sections) {
			const {$children} = this,
				headings = $children.filter('heading').map(heading => [$children.indexOf(heading), heading.name]),
				lastHeading = new Array(6).fill(-1);
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
	 * @returns {TokenCollection}
	 */
	section(n, force) {
		if (typeof n !== 'number') {
			typeError('Number');
		}
		return this.sections(force)[n];
	}

	comment() {
		const comment = new CommentToken(this).close();
		return this.replaceWith(comment);
	}

	nowiki() {
		const nowiki = new ExtToken(['nowiki', '', `${this.toString()}</nowiki>`], this.#config);
		return this.replaceWith(nowiki);
	}

	// ------------------------------ static fields ------------------------------ //

	static $ = $;

	/** @type {boolean} */
	static warning = true;
	static debugging = false;

	/** @type {string} */
	static config = './config';

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

	/**
	 * @param {?(string|number|Token|Array.<string|Token>)} wikitext
	 * @param {?number} n
	 * @param {?object} config
	 */
	static parse(wikitext, n, config) {
		if (wikitext instanceof Token) {
			return wikitext.parse(n);
		}
		return new Token(wikitext, config).parse(n);
	}

	/**
	 * @param {string} title
	 * @param {number} defaultNs
	 * @param {?object} config
	 * @returns {string}
	 */
	static normalize(title, defaultNs, config) {
		const token = new Token(null, config);
		return token.normalize(title, defaultNs);
	}

	static reload() {
		const [id] = Object.entries(require.cache).find(([, mod]) => mod.exports === Token);
		delete require.cache[id];
		const Parser = require(id);
		Parser.warning = Token.warning;
		Parser.debugging = Token.debugging;
		Parser.config = Token.config;
		return Parser;
	}
}

/**
 * @children {[string]}
 * @param {string|number} wikitext
 * @param {string} type
 * @param {?Token} parent
 * @param {Token[]} accum
 */
class AtomToken extends Token {
	constructor(text, type, parent = null, accum = [], acceptable = ['String']) {
		if (text === null || Array.isArray(text) || text instanceof Token) {
			typeError('String', 'Number');
		}
		super(text, null, true, parent, accum, acceptable);
		this.type = type;
		this.set('stage', MAX_STAGE);
	}

	/** @param {string|number|Token|TokenCollection} str */
	update(str) {
		return updateToken(this, str);
	}
}

/**
 * @children {[string]}
 * @param {string|number|Token|TokenCollection} wikitext
 * @param {Token[]} accum
 */
class NowikiToken extends AtomToken {
	constructor(wikitext, parent = null, accum = []) {
		if (!['string', 'number'].includes(typeof wikitext)
			&& !(wikitext instanceof Token) && !(wikitext instanceof $.class)
		) {
			typeError('String', 'Number', 'Token', 'TokenCollection');
		}
		super(String(wikitext), 'ext-inner', parent, accum);
		this.unremovableChild(0);
	}

	insert() {
		throw new Error(`${this.constructor.name}不可插入元素！`);
	}

	delete() {
		throw new Error(`${this.constructor.name}不可删除元素！`);
	}

	/** @param {string|number} str */
	update(str) {
		str = numberToString(str);
		if (typeof str !== 'string') {
			typeError('String', 'Number');
		}
		this.$children[0] = str;
		return this;
	}
}

/**
 * @children {[string]}
 * @param {string|number|Token|TokenCollection} wikitext
 * @param {Token[]} accum
 */
class CommentToken extends NowikiToken {
	closed = true;

	constructor(wikitext, accum = []) {
		wikitext = String(wikitext);
		if (wikitext.endsWith('-->')) {
			super(wikitext.slice(0, -3), null, accum);
		} else {
			super(wikitext, null, accum);
			this.closed = false;
		}
		this.type = 'comment';
	}

	toString() {
		return `<!--${super.toString()}${this.closed ? '-->' : ''}`;
	}

	close() {
		this.closed = true;
		return this;
	}
}

class FixedToken extends Token {
	seal() {
		return this.keepChildrenOrder().unremovableChild(this.$children.map((_, i) => i));
	}

	insert() {
		throw new Error(`${this.constructor.name}不可插入元素！`);
	}

	delete() {
		throw new Error(`${this.constructor.name}不可删除元素！`);
	}
}

/**
 * @children {[AttributeToken, Token|AtomToken]}
 * @param {[string, string, string]} matches
 * @param {object} config
 * @param {Token[]} accum
 * @throws RangeError
 */
class ExtToken extends FixedToken {
	type = 'ext';
	name; /** @type {string} */
	tags; /** @type {[string, ?string]} */
	selfClosing; /** @type {boolean} */

	constructor(matches, config = require(Token.config), accum = []) {
		const [name, attr, inner] = matches;
		super(null, null, true, null, accum, ['AttributeToken', 'AtomToken']);
		this.name = name.toLowerCase();
		this.tags = [name];
		this.selfClosing = inner === '>';
		new AttributeToken(attr, 'ext-attr', this);
		if (!this.selfClosing) {
			this.tags.push(inner.slice(-1 - name.length, -1));
		}
		const extInner = inner.slice(0, -3 - name.length);
		let innerToken;
		switch (this.name) {
			case 'ref':
				this.set('acceptable', ['AttributeToken', 'Token']);
				innerToken = new Token(extInner, config, true, this, accum);
				break;
			case 'nowiki':
				this.set('acceptable', ['AttributeToken', 'NowikiToken']);
				innerToken = new NowikiToken(extInner, this);
				break;
			/**
			 * 更多定制扩展的代码示例：
			 * case 'extensionName':
			 * 	this.set('acceptable', ['AttributeToken', 'ExtensionNameToken']);
			 * 	innerToken = new ExtensionNameToken(extInner, config, this, accum);
			 * 	break;
			 */
			default:
				innerToken = new AtomToken(extInner, 'ext-inner', this);
		}
		// 可能多余，但无妨
		innerToken.type = 'ext-inner';
		innerToken.name = this.name;
		this.freeze(['name', 'tags']).seal();
	}

	// ------------------------------ extended superclass ------------------------------ //

	toString() {
		const {selfClosing, tags, $children} = this;
		return selfClosing
			? `<${tags[0]}${$children[0]}/>`
			: `<${tags[0]}${$children[0]}>${$children[1]}</${tags[1] ?? tags[0]}>`;
	}

	hide() {
		this.selfClosing = true;
		return this;
	}

	empty() {
		return this.hide();
	}

	show(inner) {
		if (inner !== undefined) {
			this.$children[1].replaceWith(inner);
		}
		this.selfClosing = false;
		return this;
	}

	// ------------------------------ attribute modification ------------------------------ //

	/**
	 * @param {?string} key
	 * @returns {string|true|Object.<string, string|true>}
	 */
	getAttr(key) {
		return this.$children[0].getAttr(key);
	}

	/** @param {?string} key */
	removeAttr(key) {
		this.$children[0].removeAttr(key);
		return this;
	}

	/**
	 * @param {string} key
	 * @param {?(string|number|true)} value
	 */
	setAttr(key, value) {
		this.$children[0].setAttr(key, value);
		return this;
	}

	attr(...args) {
		if (args.length < 2) {
			return this.getAttr(...args);
		}
		return this.setAttr(...args);
	}
}

/**
 * @type {AtomToken}
 * @param {string} attr
 * @param {string} type
 * @param {?Token} parent
 * @param {Token[]} accum
 * @throws RangeError
 */
class AttributeToken extends AtomToken {
	#attr; /** @type {Object.<string, string|true>} */

	constructor(attr, type, parent = null, accum = []) {
		if (typeof attr !== 'string') {
			typeError('String');
		} else if (attr.includes('>')) {
			throw new RangeError('扩展或HTML标签属性不能包含">"！');
		} else if (type === 'html-attr' && attr.includes('<')) {
			throw new RangeError('HTML标签属性不能包含"<"！');
		}
		super(attr, type, parent, accum);
		if (parent.name) {
			this.name = parent.name;
		}
		const that = this;
		this.parseAttr()
			.set('acceptable', ['String', ...this.type === 'ext-attr' ? [] : ['ArgToken', 'TranscludeToken']])
			.on('parentReset', function attribute(oldParent, newParent) {
				if (oldParent.type !== newParent.type) {
					that.set('parent', oldParent);
					throw new Error('AttributeToken: 不能更改父节点的type！');
				}
			});
		if (this.type === 'ext-attr') {
			this.unremovableChild(0);
		} else {
			this.on('childDetached childReplaced', function attribute() {
				that.parseAttr();
			});
		}
	}

	build() {
		super.build();
		if (this.type === 'ext-attr') {
			return this;
		}
		const accum = this.get('accum');
		for (let key in this.#attr) {
			const text = this.#attr[key];
			if (key.includes('\x00')) {
				delete this.#attr[key];
				key = buildOnce(key, accum).join('');
				this.#attr[key] = text;
			}
			if (typeof text === 'string' && text.includes('\x00')) {
				this.#attr[key] = buildOnce(text, accum).join('');
			}
		}
		return this;
	}

	parseAttr() {
		this.#attr = {};
		for (const [, key,, quoted, unquoted] of this.toString()
			.matchAll(/([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(?:\2|$)|(\S*)))?/sg)
		) {
			this.setAttr(key, quoted ?? unquoted ?? true, true);
		}
		return this;
	}

	// ------------------------------ extended superclass ------------------------------ //

	insert(args, i) {
		if (this.type === 'ext-attr') {
			throw new Error('扩展标签属性只能是字符串！');
		}
		super.insert(args, i);
		return this.parseAttr();
	}

	delete(...args) {
		if (this.type === 'ext-attr') {
			throw new Error('扩展标签属性只能是字符串！');
		}
		super.delete(...args);
		return this.parseAttr();
	}

	/**
	 * @param {string} str
	 * @param {boolean} done
	 */
	update(str, done) {
		if (this.type === 'ext-attr' && typeof str !== 'string') {
			throw new TypeError('扩展标签属性只能是字符串！');
		} else if (this.type === 'ext-attr') {
			this.$children[0] = str;
		} else {
			super.update(str);
		}
		if (done) {
			return this;
		}
		return this.parseAttr();
	}

	/**
	 * @param {string} key
	 * @param {?string} equal
	 * @param {?string} val
	 * @param {?string} i
	 * @returns {boolean}
	 */
	isAttr(key, equal, val, i) {
		const [callee, thisCaller] = caller();
		if (thisCaller !== 'AttributeToken.is') {
			Token.debug('caller', {callee, caller: thisCaller});
			throw new Error('禁止外部调用Token.isAttr方法！');
		}
		const attr = this.getAttr(key),
			thisVal = i ? String(attr).toLowerCase() : String(attr);
		switch (equal) {
			case '=':
				return attr !== undefined && thisVal === val;
			case '~=':
				return typeof attr === 'string' && thisVal.split(/\s/).some(v => v === val);
			case '|=':
				return attr !== undefined && (thisVal === val || thisVal.startsWith(`${val}-`));
			case '^=':
				return attr !== undefined && thisVal.startsWith(val);
			case '$=':
				return attr !== undefined && thisVal.endsWith(val);
			case '*=':
				return attr !== undefined && thisVal.includes(val);
			case '!=':
				return attr === undefined || thisVal !== val;
			default:
				return attr !== undefined;
		}
	}

	// ------------------------------ attribute modification ------------------------------ //

	/**
	 * @param {?string} key
	 * @returns {string|true|Object.<string, string|true>}
	 */
	getAttr(key) {
		if (key !== undefined && typeof key !== 'string') {
			typeError('String');
		}
		return key === undefined ? this.#attr : this.#attr[key.toLowerCase().trim()];
	}

	empty() {
		this.#attr = {};
		return this.update('', true);
	}

	#updateFromAttr() {
		Token.warn(true, '这个方法会自动清除嵌入的模板和无效属性！');
		const str = Object.entries(this.#attr).map(([k, v]) => {
			if (v === true) {
				return k;
			}
			const quote = v.includes('"') ? "'" : '"';
			return `${k}=${quote}${v}${quote}`;
		}).join(' ');
		this.update(str && ` ${str}`, true);
	}

	/** @param {?string} key */
	removeAttr(key) {
		if (key === undefined) {
			this.empty();
		} else if (typeof key !== 'string') {
			typeError('String');
		}
		key = key.toLowerCase().trim();
		if (key in this.#attr) {
			delete this.#attr[key];
			this.#updateFromAttr();
		}
		return this;
	}

	/**
	 * @param {string} key
	 * @param {?(string|number|true)} value
	 * @param {boolean} init
	 * @throws RangeError
	 */
	setAttr(key, value, init) {
		if (typeof key !== 'string') {
			typeError('String');
		}
		value = numberToString(value);
		if (value === undefined) {
			return this.removeAttr(key);
		} else if (value === true) {
			// pass
		} else if (value.includes('>')) {
			throw new RangeError('扩展或HTML标签属性不能包含">"！');
		} else if (this.type !== 'ext-attr' && value.includes('<')) {
			throw new RangeError('HTML标签属性不能包含"<"！');
		}
		key = key.toLowerCase().trim();
		if (/^(?:[\w:]|\x00\d+t\x7f)(?:[\w:.-]|\x00\d+t\x7f)*$/.test(key)) {
			this.#attr[key] = value === true ? true : value.replace(/\s/g, ' ').trim();
			if (!init) {
				this.#updateFromAttr();
			}
		}
		return this;
	}

	attr(...args) {
		if (args.length < 2) {
			return this.getAttr(...args);
		}
		return this.setAttr(...args);
	}
}

/**
 * @type {[Token, Token]}
 * @param {number} level
 * @param {[string, string]} input
 * @param {object} config
 * @param {Token[]} accum
 */
class HeadingToken extends FixedToken {
	type = 'heading';
	name; /** @type {string} */

	constructor(level, input, config = require(Token.config), accum = []) {
		super(null, config, true, null, accum, ['Token']);
		this.name = String(level);
		input.forEach((text, i) => {
			const token = new Token(text, config, true, this, accum, i === 0 ? null : ['String', 'CommentToken']);
			token.type = i === 0 ? 'heading-title' : 'heading-trail';
			token.name = this.name;
			token.set('stage', i === 0 ? 2 : MAX_STAGE);
		});
		this.seal();
	}

	toString() {
		const equals = '='.repeat(this.name);
		return `${equals}${this.$children[0]}${equals}${this.$children[1]}`;
	}

	/** @param {string|number|Token|TokenCollection} title */
	update(title) {
		updateToken(this.$children[0], title);
		return this;
	}

	/** @param {number} n */
	level(n) {
		n = Math.min(Math.max(n, 1), 6);
		this.name = String(n);
		return this;
	}
}

/**
 * @type {[AtomToken, ?Token, ?AtomToken]}
 * @param {string[][]} parts
 * @param {object} config
 * @param <Token[]> accum
 */
class ArgToken extends Token {
	type = 'arg';
	name; /** @type {string} */

	constructor(parts, config = require(Token.config), accum = []) {
		super(null, config, true, null, accum, ['AtomToken', 'Token']);
		parts.map(part => part.join('=')).forEach((part, i) => {
			if (i === 0 || i > 1) {
				new AtomToken(
					part,
					i === 0 ? 'arg-name' : 'arg-redundant',
					this,
					accum,
					['String', 'CommentToken', 'ExtToken', 'ArgToken', 'TranscludeToken'],
				);
			} else {
				const token = new Token(part, config, true, this, accum);
				token.type = 'arg-default';
				token.set('stage', 2);
			}
		});
		const {$children} = this;
		this.keepChildrenOrder().unremovableChild(0)
			.on('childDetached', function arg(_, i) {
				if (i === 1 && $children.length > 1) {
					Token.warn(true, 'ArgToken存在冗余子节点时删除arg-default节点！');
					$children.slice(1).detach(); // 必须使用TokenCollection.detach以避免抛出错误
				}
			});
	}

	toString() {
		return `{{{${this.$children.join('|')}}}}`;
	}

	insert(args, i = this.$children.length) {
		args = Array.isArray(args) ? args : [args];
		if (i !== 1 || args.length > 1) {
			throw new RangeError('ArgToken不可插入arg-name或arg-redundant子节点！');
		} else if (!(args[0] instanceof Token)) {
			throw new TypeError('arg-default子节点应为Token！');
		}
		args[0].type = 'arg-default';
		return super.insert(args, i);
	}

	delete(...args) {
		if (args.includes(0) || args.includes(this.$children[0])) {
			throw new RangeError('ArgToken不能删除arg-name子节点！');
		} else if (args.includes(1) || args.includes(this.$children[1])) {
			args = this.$children.slice(1);
		}
		return super.delete(...args);
	}

	/** @param {string|number|Token} name */
	rename(name) {
		name = numberToString(name);
		const {$children: {0: test, length}} = new Token(`{{{${name.toString()}}}}`, this.get('config')).parse(2);
		if (length !== 1 || test.type !== 'arg' || test.$children.length !== 1) {
			throw new SyntaxError(`Syntax error in triple-brace argument name: ${
				name.toString().replaceAll('\n', '\\n')
			}`);
		} else if (name.constructor.name !== 'AtomToken') {
			[name] = test;
		} else {
			name.type = 'arg-name';
		}
		this.$children[0].replaceWith(name);
		this.name = removeComment(name.toString());
		return this;
	}

	/**
	 * @param {Token|string|number} token
	 * @throws SyntaxError
	 * @throws RangeError
	 */
	setDefault(str) {
		str = numberToString(str);
		const {$children: {0: test, length}} = new Token(`{{{|${str.toString()}}}}`, this.get('config')).parse(2);
		if (length !== 1 || test.type !== 'arg' || test.$children.length !== 2) {
			throw new SyntaxError(`Syntax error in triple-brace argument default: ${
				str.toString().replaceAll('\n', '\\n')
			}`);
		} else if (str.constructor.name !== 'Token') {
			[, str] = test;
		} else {
			str.type = 'arg-default';
		}
		if (this.$children.length > 1) {
			this.$children[1].replaceWith(str);
			return this;
		}
		return this.append(str);
	}

	removeRedundant() {
		this.$children.slice(2).detach();
		return this;
	}
}

/**
 * @type {[AtomToken, ?ParameterToken]}
 * @param {string[][]} parts
 * @param {object} config
 * @param {Token[]} accum
 */
class TranscludeToken extends Token {
	type = 'template';
	name; /** @type {string} */
	#keys; /** @type {Set.<string>} */
	#args = new Map(); /** @type {Map.<string, TokenCollection>} */

	constructor(parts, config = require(Token.config), accum = []) {
		super(null, config, true, null, accum, ['AtomToken', 'ParameterToken']);
		const [title] = parts.shift(),
			{parserFunction: [sensitive, insensitive]} = config;
		if (parts.length === 0 || title.includes(':')) {
			const [magicWord, ...arg] = title.split(':'),
				name = removeComment(magicWord);
			if (sensitive.includes(name) || insensitive.includes(name.toLowerCase())) {
				this.name = name.toLowerCase().replace(/^#/, '');
				this.type = 'magic-word';
				new AtomToken(magicWord, 'magic-word-name', this, accum);
				if (arg.length) {
					parts.unshift([arg.join(':')]);
				}
			}
		}
		if (this.type === 'template') {
			const name = removeComment(title);
			if (/\x00\d+e\x7f|[#<>[\]{}]/.test(name)) {
				throw new SyntaxError(`非法的模板名称：${name}`);
			}
			new AtomToken(
				title,
				'template-name',
				this,
				accum,
				['String', 'CommentToken', 'ArgToken', 'TranscludeToken'],
			);
		}
		let i = 1;
		parts.forEach(part => {
			if (part.length === 1) {
				part.unshift(i);
				i++;
			}
			new ParameterToken(...part, config, this, accum, false);
		});
		const {type, $children} = this,
			that = this;
		this.keepChildrenOrder().unremovableChild(0)
			.on('childReplaced', function transclude(oldChild, newChild, index) {
				if (index > 0) {
					const {anon} = oldChild;
					if (newChild.anon !== anon) {
						console.warn(`${anon ? '匿名' : '命名'}参数变更为${anon ? '命名' : '匿名'}参数！`);
					}
					that.#handleReplacedArg(oldChild, newChild);
					return;
				}
				const name = removeComment(newChild.toString());
				// keepChildrenOrder使得魔术字和模板间不能互换
				if (type === 'magic-word'
					&& !sensitive.includes(name) && !insensitive.includes(name.toLowerCase())
					|| type === 'template' && /\x00\d+e\x7f|[#<>[\]{}]/.test(name)
				) {
					$children.splice(index, 1, oldChild);
					throw new SyntaxError(`${type === 'magic-word' ? '不存在的魔术字：' : '非法的模板名称：'}${name}`);
				}
			}).on('childDetached', function transclude(child) {
				if (child.anon && (type === 'template' || that.name === 'invoke')) {
					console.warn('移除了一个匿名参数！');
				}
				that.#handleDeletedArg(child);
			});
	}

	// ------------------------------ extended superclass ------------------------------ //

	toString() {
		const {$children} = this;
		return this.type === 'magic-word'
			? `{{${$children[0]}${$children.length > 1 ? ':' : ''}${$children.slice(1).join('|')}}}`
			: `{{${$children.join('|')}}}`;
	}

	insert(args, i = this.$children.length) {
		args = Array.isArray(args) ? args : [args];
		if (i === 0) {
			throw new RangeError('TranscludeToken不可插入name子节点！');
		} else if (args.some(token => !(token instanceof ParameterToken))) {
			throw new TypeError('TranscludeToken仅可插入ParameterToken！');
		}
		const hasAnon = args.some(({anon}) => anon);
		super.insert(args, i);
		if (hasAnon) {
			if (this.type === 'template' && i < this.$children.length) {
				console.warn('新的匿名参数被插入中间！');
			}
			this.#handleAnonArgChange();
		}
		args.filter(({anon}) => !anon).forEach(token => {
			this.#handleAddedArg(token);
		});
		return this;
	}

	delete(...args) {
		if (args.includes(0) || args.includes(this.$children[0])) {
			throw new RangeError('TranscludeToken不能删除name子节点！');
		}
		const tokens = args.map(i => typeof i === 'number' ? this.$children[i] : i),
			hasAnon = tokens.some(({anon}) => anon);
		super.delete(...tokens);
		if (hasAnon) {
			if (this.type === 'template') {
				console.warn('部分匿名参数被删除！');
			}
			this.#handleAnonArgChange();
		}
		tokens.filter(({anon}) => !anon).forEach(token => {
			this.#handleDeletedArg(token);
		});
		return this;
	}

	// ------------------------------ transclusion specifics ------------------------------ //

	#handleAnonArgChange() {
		this.resetAnonKeys().#keys = undefined;
		this.#args.forEach((_, key) => {
			const number = Number(key);
			if (Number.isInteger(number) && number > 0) {
				this.#args.delete(key);
			}
		});
		return this;
	}

	#handleAddedArg(arg) {
		if (arg.anon) {
			return this.#handleAnonArgChange();
		}
		this.#args.get(arg.name)?.push(arg);
		this.#keys?.add(arg.name);
		return this;
	}

	#handleDeletedArg(arg) {
		if (arg.anon) {
			return this.#handleAnonArgChange();
		}
		this.#args.get(arg.name)?.delete(arg);
		if (this.getArgs(arg.name).length === 0) {
			this.#keys?.delete(arg.name);
		}
		return this;
	}

	#handleReplacedArg(oldArg, newArg) {
		if (oldArg.anon && newArg.anon) {
			newArg.name = oldArg.name;
			this.#args.get(oldArg.name)?.delete(oldArg)?.push(newArg);
		} else if (!oldArg.anon && !newArg.anon && oldArg.name === newArg.name) {
			this.#args.get(oldArg.name)?.delete(oldArg)?.push(newArg);
		} else {
			this.#handleAddedArg(newArg).#handleDeletedArg(oldArg);
		}
		return this;
	}

	/** @returns {TokenCollection.<ParameterToken>} */
	getAllArgs() {
		return this.$children.slice(1);
	}

	/** @returns {TokenCollection.<ParameterToken>} */
	getAnonArgs() {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	resetAnonKeys() {
		const anonArgs = this.getAnonArgs();
		anonArgs.forEach(token => {
			token.name = String(anonArgs.indexOf(token));
		});
		return this;
	}

	/**
	 * @param {string|number} key
	 * @returns {TokenCollection.<ParameterToken>}
	 */
	getArgs(key) {
		key = String(key);
		let args = this.#args.get(key);
		if (!args) {
			args = this.getAllArgs().filter(({name}) => key === name);
			this.#args.set(key, args);
		}
		return args;
	}

	/**
	 * @param {string|number} key
	 * @param {boolean} any
	 * @returns {?ParameterToken}
	 */
	getArg(key, any) {
		const args = this.getArgs(key);
		return (any ? args : args.filter(({anon}) => typeof key === 'number' === anon)).at(-1);
	}

	/** @returns {Set.<string>} */
	getKeys() {
		this.#keys ||= new Set(this.getAllArgs().map(({name}) => name));
		return this.#keys;
	}

	/**
	 * @param {string|number} key
	 * @returns {string[]}
	 */
	getValues(key) {
		return this.getArgs(key).map(arg => arg.getValue());
	}

	/**
	 * @param {?(string|number)} key
	 * @returns {?string|Object.<string, string>}
	 */
	getValue(key) {
		if (key !== undefined) {
			return this.getValues(key).at(-1);
		}
		return Object.fromEntries([...this.getKeys()].map(k => this.getValue(k)));
	}

	/**
	 * @param {string|number|Token} val
	 * @throws SyntaxError
	 */
	newAnonArg(val) {
		val = numberToString(val);
		if (val instanceof ParameterToken) {
			val.anon = true; // 未转义'='，交给下面的步骤检查
		}
		const {$children: {0: test, length}} = new Token(`{{:T|${val.toString()}}}`, this.get('config')).parse(2);
		if (length !== 1 || !test.is('template#T') || test.$children.length !== 2 || !test.$children[1].anon) {
			throw new SyntaxError(`Syntax error in ${this.type} anonymous argument value: ${
				val.toString().replaceAll('\n', '\\n')
			}`);
		} else if (val.constructor.name !== 'ParameterToken') {
			[, val] = test;
		}
		return this.append(val);
	}

	/**
	 * @param {?(string|number)} key
	 * @param {string|number|Token} value
	 * @param {number} i
	 * @throws SyntaxError
	 */
	setValue(key, value, i = this.$children.length) {
		if (key === undefined) {
			if (i !== this.$children.length) {
				console.warn('插入匿名参数时或略指定的位置参数！');
			}
			return this.newAnonArg(value);
		}
		let arg = this.getArg(key, true);
		if (arg) {
			arg.setValue(value);
			return this;
		}
		value = numberToString(value);
		i = Math.min(Math.max(i, 1), this.$children.length);
		const {
			$children: {0: test, length},
		} = new Token(`{{:T|${key}=${value.toString()}}}`, this.get('config')).parse(2);
		if (length !== 1 || !test.is('template#T')
			|| test.$children.length !== 2 || test.$children[1].name !== key
		) {
			throw new SyntaxError(`Syntax error in ${this.type} argument value: ${
				value.toString().replaceAll('\n', '\\n')
			}`);
		}
		[, arg] = test; // 总是改写成命名参数
		return this.insert(arg, i);
	}

	val(...args) {
		if (args.length < 2) {
			return this.getValue(...args);
		}
		return this.setValue(...args);
	}

	naming() {
		this.getAllArgs().filter(({anon}) => anon).forEach(arg => {
			arg.$children[0].update(arg.name);
			arg.anon = false;
		});
		return this;
	}

	/** @param {string|number} key */
	removeArg(key) {
		return this.delete(...this.getArgs(key));
	}

	/**
	 * @param {ParameterToken} token
	 * @param {string} oldKey
	 */
	updateKey(token, oldKey) {
		const [callee, thisCaller] = caller();
		if (thisCaller !== 'ParameterToken.rename') {
			Token.debug('caller', {callee, caller: thisCaller});
			throw new Error('禁止外部调用TranscludeToken.updateKey方法！');
		}
		const oldArgs = this.getArgs(oldKey).delete(token);
		if (oldArgs.length === 0) {
			this.#keys.delete(oldKey);
		}
		this.#keys.add(this.name);
		this.#args.get(this.name)?.push(this);
		return this;
	}
}

/**
 * @type {[AtomToken, Token]}
 * @param {string|number} key
 * @param {string|number} value
 * @param {object} config
 * @param {?Token} parent
 * @param {Token[]} accum
 * @param {boolean} autofix
 */
class ParameterToken extends FixedToken {
	type = 'parameter';
	anon = false;
	name; /** @type {string} */
	#value; /** @type {string} */

	constructor(key, value, config = require(Token.config), parent = null, accum = [], autofix = true) {
		if (autofix) {
			key = String(key);
		}
		super(null, config, true, parent, accum, ['AtomToken', 'Token']);
		if (typeof key === 'number') {
			this.anon = true;
			this.name = String(key);
		}
		new AtomToken(
			key,
			'parameter-key',
			this,
			accum,
			['String', 'CommentToken', 'ExtToken', 'ArgToken', 'TranscludeToken'],
		);
		const token = new Token(value, config, true, this, accum);
		token.type = 'parameter-value';
		token.set('stage', 2);
		this.seal();
	}

	toString() {
		return this.anon ? this.$children[1].toString() : this.$children.join('=');
	}

	/** @returns {string} */
	getValue() {
		if (this.#value === undefined) {
			this.#value = removeComment(
				this.$children.at(-1).toString(),
				!this.anon || this.parent()?.type !== 'template',
			);
		}
		return this.#value;
	}

	/**
	 * @param {string|number|Token} value
	 * @throws SyntaxError
	 */
	setValue(value) {
		value = numberToString(value);
		const {anon} = this,
			{
				$children: {0: test, length},
			} = new Token(`{{:T|${anon ? '' : '1='}${value}}}`, this.get('config')).parse(2);
		if (length !== 1 || !test.is('template#T')
			|| test.$children.length !== 2 || test.$children[1].anon !== anon || test.$children[1].name !== '1'
		) {
			throw new SyntaxError(`Syntax error in template/magic-word argument value: ${
				value.toString().replaceAll('\n', '\\n')
			}`);
		}
		if (value.constructor.name !== 'Token') {
			[, [, value]] = test;
		} else {
			value.type = 'parameter-value';
		}
		this.$children[1].replaceWith(value);
		return this;
	}

	val(...args) {
		if (args.length === 0) {
			return this.getValue();
		}
		return this.setValue(args[0]);
	}

	/**
	 * @param {string|number} key
	 * @param {boolean} force
	 * @throws Error
	 * @throws RangeError
	 */
	rename(key, force) {
		if (this.anon) {
			throw new Error(`匿名参数 ${this.name} 不能简单地更名！`);
		}
		key = String(key);
		const name = removeComment(key),
			{name: oldName} = this,
			parent = this.parent(),
			keys = parent?.getKeys(); // 确保执行一次getKeys()
		if (oldName === name) {
			Token.warn(`ParameterToken.rename: 未改变实际参数名 ${name}！`);
		} else if (keys?.has(name)) {
			const msg = `参数更名造成重复参数：${name}`;
			if (force) {
				console.warn(`ParameterToken.rename: ${msg}`);
			} else {
				throw new RangeError(msg);
			}
		}
		this.$children[0].update(key);
		this.name = name;
		parent?.updateKey(this, oldName);
		return this;
	}
}

module.exports = Token;
