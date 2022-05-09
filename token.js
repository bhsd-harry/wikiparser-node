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
 * 6. 内链，含文件和分类，参见Parser::handleInternalLinks2
 * 7. 外链，参见Parser::handleExternalLinks
 * 8. ISBN、RFC（未来将废弃，不予支持）和自由外链，参见Parser::handleMagicLinks
 * 9. 段落和列表，参见BlockLevelPass::execute
 * 10. 转换，参见LanguageConverter::recursiveConvertTopLevel
 */

/* eslint-disable no-control-regex, no-new */
const MAX_STAGE = 10,
	attrRegex = /([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(?:\2|$)|(\S*)))?/sg,
	attrNameRegex = /^(?:[\w:]|\x00\d+\x7f)(?:[\w:.-]|\x00\d+\x7f)*$/;
const ucfirst = str => str && `${str[0].toUpperCase()}${str.slice(1)}`.replaceAll('_', ' '),
	removeComment = str => str.replace(/<!--.*?-->|\x00\d+c\x7f/g, '').trim(),
	numberToString = n => typeof n === 'number' ? String(n) : n;
const caller = () => {
	try {
		throw new Error();
	} catch ({stack}) {
		return stack.match(/(?<=^\s+at )[\w.]+(?= \()/gm)?.[2];
	}
};

/** @type {[string]} */
class Token extends Array {
	type = 'root';
	#stage = 0; // 解析阶段，参见顶部注释
	#parent;
	#config;
	#accum;
	#sections;

	constructor(wikitext = null, config = require('./config'), halfParsed = false, parent = null, accum = []) {
		wikitext = numberToString(wikitext); // eslint-disable-line no-param-reassign
		if (wikitext === null) {
			super();
		} else if (typeof wikitext === 'string') {
			super(halfParsed ? wikitext : wikitext.replace(/[\x00\x7f]/g, ''));
		} else {
			throw new TypeError('仅接受String作为输入参数！');
		}
		this.#parent = parent;
		this.#config = config;
		this.#accum = accum;
		if (parent) {
			parent.push(this);
		}
		accum.push(this);
	}

	set(key, value) {
		switch (key) {
			case 'stage':
				this.#stage = value;
				break;
			case 'parent':
				this.#parent = value;
				break;
			default:
				this[key] = value;
		}
		return this;
	}

	get(key) {
		switch (key) {
			case 'stage':
				return this.#stage;
			case 'parent':
				return this.#parent;
			case 'config':
				return this.#config;
			case 'accum':
				return this.#accum;
			default:
				return this[key];
		}
	}

	prop(...args) {
		if (args.length === 1) {
			return this.get(...args);
		}
		return this.set(...args);
	}

	isPlain() {
		return this.constructor.name === 'Token';
	}

	concat(...args) {
		return this.isPlain() ? super.concat.apply(this, args) : [...this].concat(...args);
	}

	filter(...args) {
		if (typeof args[0] === 'string') {
			return this.children(...args);
		}
		const subset = [...this].filter(...args);
		if (this.isPlain()) {
			const token = new Token(null);
			token.push(...subset);
			return token;
		}
		return subset;
	}

	flat(...args) {
		const result = [...this].flat(...args);
		if (this.isPlain()) {
			const token = new Token(null);
			token.push(...result);
			return token;
		}
		return result;
	}

	flatMap(...args) {
		return [...this].flatMap(...args);
	}

	map(...args) {
		return [...this].map(...args);
	}

	slice(...args) {
		return this.isPlain() ? super.slice.apply(this, args) : [...this].slice(...args);
	}

	splice(...args) {
		if (this.isPlain()) {
			return super.splice.apply(this, args);
		}
		const arr = [...this],
			output = arr.splice(...args);
		this.length = 0;
		this.push(...arr);
		return output;
	}

	toString() {
		return this.join('');
	}

	text() {
		return this.toString();
	}

	parseOnce(n = this.#stage) {
		if (!['Token.parseOnce', 'Token.parse'].includes(caller())) {
			Token.warn('Token.parseOnce方法一般不应直接调用，仅用于代码调试！');
		}
		if (n < this.#stage || !this.isPlain()) {
			return;
		} else if (n > this.#stage) {
			throw new RangeError(`当前解析层级为${this.#stage}！`);
		}
		switch (n) {
			case 0: {
				if (this.type === 'root') {
					this.#accum.shift();
				}
				const regex = new RegExp(
					`<!--.*?(?:-->|$)|<(${this.#config.ext.join('|')})(\\s.*?)?(/>|>.*?</\\1>)`,
					'gi',
				);
				this[0] = this[0].replace(regex, (substr, name, attr = '', inner = '') => {
					const str = `\x00${this.#accum.length}${name ? '' : 'c'}\x7f`;
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
					lastIndex;
				while (mt) {
					const {0: syntax, index: curIndex} = mt,
						top = stack.pop(),
						{0: open, index, parts} = top ?? {},
						innerEqual = syntax === '=' && top?.findEqual;
					if ([']]', '}-'].includes(syntax)) { // 情形1：闭合内链或转换
						lastIndex = curIndex + 2;
					} else if (syntax === '\n') { // 情形2：闭合标题
						lastIndex = curIndex + 1;
						const {pos, findEqual} = stack.at(-1) ?? {};
						if (!pos || findEqual || removeComment(text.slice(pos, index)) !== '') {
							const rmt = text.slice(index, curIndex).match(/^(={1,6})(.+)\1((?:\s|\x00\d+c\x7f)*)$/);
							if (rmt) {
								text = `${text.slice(0, index)}\x00${this.#accum.length}\x7f${text.slice(lastIndex)}`;
								lastIndex = index + 2 + String(this.#accum.length).length;
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
							rest = open.length - close.length;
						lastIndex = curIndex + close.length; // 这不是最终的lastIndex
						parts.at(-1).push(text.slice(top.pos, curIndex));
						/* 标记{{!}} */
						let name = '';
						if (close.length === 2) {
							name = removeComment(parts[0][0]);
							name = name === '!' ? name : '';
						}
						/* 标记{{!}}结束 */
						text = `${text.slice(0, index + rest)}\x00${
							this.#accum.length
						}${name}\x7f${text.slice(lastIndex)}`;
						lastIndex = index + rest + 2 + String(this.#accum.length).length + name.length;
						if (close.length === 3) {
							new ArgToken(parts, this.#config, this.#accum);
						} else {
							new TranscludeToken(parts, this.#config, this.#accum);
						}
						if (rest > 1) {
							stack.push({0: open.slice(0, rest), index, pos: index + rest, parts: [[]]});
						} else if (rest === 1 && text[index - 1] === '-') {
							stack.push({0: '-{', index: index - 1, pos: index + 1, parts: [[]]});
						}
					} else { // 情形5：开启
						lastIndex = curIndex + syntax.length;
						if (syntax.startsWith('{')) {
							mt.pos = curIndex + syntax.length;
							mt.parts = [[]];
						}
						if (top) {
							stack.push(top);
						}
						stack.push(mt);
					}
					const curTop = stack.at(-1);
					regex = new RegExp(source + (curTop
						? `|${closes[curTop[0][0]]}${curTop.findEqual ? '|=' : ''}`
						: ''
					), 'gm');
					regex.lastIndex = lastIndex;
					mt = regex.exec(text);
				}
				this[0] = text;
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
				return;
			default:
				throw new RangeError('解析层级应为0～10的整数！');
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.parseOnce(n);
			}
		}
		this.#stage++;
	}

	build() {
		const thisCaller = caller();
		if (thisCaller !== 'Token.parse' && !thisCaller.endsWith('Token.build')) {
			Token.warn('Token.build方法一般不应直接调用，仅用于代码调试！');
		}
		this.#stage = MAX_STAGE;
		if (!this.isPlain() && !(this instanceof AtomToken) || !this[0].includes('\x00')) {
			return;
		}
		const text = this.pop();
		this.push(...text.split(/[\x00\x7f]/).map((str, i) => {
			if (i % 2 === 0) {
				return str;
			}
			const token = this.#accum[str.replace(/[c!]$/, '')];
			return token.set('parent', this);
		}).filter(str => str !== ''));
		if (this.length === 0) {
			this.push('');
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.build();
			}
		}
	}

	parse(n = MAX_STAGE) {
		if (n < MAX_STAGE && caller() !== 'ParameterToken.setValue') {
			Token.warn('指定解析层级的方法仅供熟练用户使用！');
		}
		while (this.#stage < n) {
			this.parseOnce(this.#stage);
		}
		this.build();
		return this.each('arg, template, parameter', token => {
			if (token.name) { // 匿名参数
				return;
			}
			token.name = removeComment(token[0].toString());
			if (token.type === 'template') {
				token.name = token.normalize(token.name, 'Template');
			}
		});
	}

	is(selector) {
		if (!selector?.trim()) {
			return true;
		}
		const func = ['not', 'has', 'contains'],
			regex = new RegExp(
				`:(${func.join('|')})\\(\\s*(?:(["'])([^']*)\\2|([^()]*?))\\s*\\)(?=:|\\s*(?:,|$))`,
				'g',
			),
			hasFunc = regex.test(selector);
		if (!selector.includes(',') && !hasFunc) {
			const [type, ...parts] = selector.trim().split('#'),
				name = parts.join('#');
			return (!type || this.type === type) && (!name || this.name === name);
		} else if (!hasFunc) {
			return selector.split(',').some(str => this.is(str));
		}
		const calls = Object.fromEntries(func.map(f => [f, []]));
		regex.lastIndex = 0;
		const selectors = selector.replace(regex, (_, f, __, quoted, unquoted) => {
			calls[f].push(quoted ?? unquoted);
			return `:${f}(${calls[f].length - 1})`;
		}).split(',');
		return selectors.some(str => {
			const curCalls = Object.fromEntries(func.map(f => [f, []]));
			str = str.replace(regex, (_, f, __, ___, i) => { // eslint-disable-line no-param-reassign
				curCalls[f].push(calls[f][i]);
				return '';
			});
			return this.is(str) && !curCalls.not.some(s => this.is(s))
				&& curCalls.has.every(s => this.is(s) || this.search(s).length)
				&& curCalls.contains.every(s => this.toString().includes(s));
		});
	}

	children(selector) {
		return this.filter(token => token instanceof Token && token.is(selector));
	}

	not(selector) {
		return this.filter(token => token instanceof Token && !token.is(selector));
	}

	search(selector) {
		return this.children().flatMap(token => [
			...token.is(selector) ? [token] : [],
			...token.search(selector),
		]);
	}

	closest(selector) {
		let ancestor = this; // eslint-disable-line consistent-this
		while (ancestor) {
			if (ancestor.is(selector)) {
				return ancestor;
			}
			ancestor = ancestor.parent();
		}
		return null;
	}

	parent(selector) {
		const parent = this.#parent;
		return parent?.is(selector) ? parent : null;
	}

	parents(selector) {
		let ancestor = this.#parent;
		const parents = [];
		while (ancestor) {
			if (ancestor.is(selector)) {
				parents.push(ancestor);
			}
			ancestor = ancestor.parent();
		}
		return parents;
	}

	parentsUntil(selector) {
		let ancestor = this.#parent;
		const parents = [];
		while (ancestor && !ancestor.is(selector)) {
			parents.push(ancestor);
			ancestor = ancestor.parent();
		}
		return parents;
	}

	contains(token) {
		return typeof token === 'string'
			? this.toString().includes(token)
			: this.includes(token) || this.children().some(child => child.contains(token));
	}

	each(...args) {
		const selector = args.find(arg => typeof arg === 'string') ?? '',
			callback = args.find(arg => typeof arg === 'function'),
			maxDepth = args.find(arg => typeof arg === 'number') ?? Infinity,
			children = this.children();
		if (callback.constructor.name !== 'AsyncFunction') {
			if (this.is(selector)) {
				callback(this);
			}
			if (maxDepth > 0) {
				for (const token of children) {
					token.each(selector, callback, maxDepth - 1);
				}
			}
			return this;
		}
		return (async () => {
			if (this.is(selector)) {
				await callback(this);
			}
			if (maxDepth > 0) {
				for (const token of children) {
					await token.each(selector, callback, maxDepth - 1); // eslint-disable-line no-await-in-loop
				}
			}
			return this;
		})();
	}

	even() {
		return this.filter((_, i) => i % 2 === 0);
	}

	odd() {
		return this.filter((_, i) => i % 2 === 1);
	}

	has(selector) {
		return this.children().filter(token => token.is(selector) || token.search(selector).length);
	}

	find(...args) {
		if (typeof args[0] === 'function') {
			return super.find.apply(this, args);
		}
		return this.find(token => token instanceof Token && token.is(args[0]));
	}

	findIndex(...args) {
		if (typeof args[0] === 'function') {
			return super.findIndex.apply(this, args);
		}
		return this.findIndex(token => token instanceof Token && token.is(args[0]));
	}

	index() {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有父节点！');
		}
		return parent.indexOf(this);
	}

	lastIndex() {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有父节点！');
		}
		return parent.lastIndexOf(this);
	}

	next(selector) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const sibling = parent[parent.indexOf(this) + 1];
		return selector === undefined || sibling instanceof Token && sibling.is(selector) ? sibling : null;
	}

	prev(selector) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const sibling = parent[parent.indexOf(this) - 1];
		return selector === undefined || sibling instanceof Token && sibling.is(selector) ? sibling : null;
	}

	nextAll(selector) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const siblings = parent.slice(parent.indexOf(this) + 1);
		return selector === undefined
			? siblings
			: siblings.filter(token => token instanceof Token && token.is(selector));
	}

	prevAll(selector) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const siblings = parent.slice(0, parent.indexOf(this));
		return selector === undefined
			? siblings
			: siblings.filter(token => token instanceof Token && token.is(selector));
	}

	nextUntil(selector) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const siblings = parent.slice(parent.indexOf(this) + 1),
			index = siblings.findIndex(token => token instanceof Token && token.is(selector));
		return index === -1 ? siblings : siblings.slice(0, index);
	}

	prevUntil(selector) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const siblings = parent.slice(0, parent.indexOf(this)).reverse(),
			index = siblings.findIndex(token => token instanceof Token && token.is(selector));
		return index === -1 ? siblings : siblings.slice(0, index);
	}

	siblings(selector) {
		const parent = this.#parent;
		if (parent === null) {
			throw new Error('根节点没有兄弟节点！');
		}
		const siblings = parent.slice();
		siblings.splice(parent.indexOf(this), 1);
		return selector === undefined
			? siblings
			: siblings.filter(token => token instanceof Token && token.is(selector));
	}

	after(...args) {
		const parent = this.#parent;
		if (!parent) {
			throw new Error('根节点不能有兄弟节点！');
		}
		const legalArgs = args.filter(arg => typeof arg === 'string' || !arg.contains(this));
		if (legalArgs.length < args.length) {
			console.error('Token.after: 会造成循环结构的节点未插入！');
		}
		parent.splice(parent.indexOf(this) + 1, 0, ...legalArgs);
		legalArgs.filter(arg => arg instanceof Token).forEach(token => {
			token.set('parent', parent);
		});
		return this;
	}

	before(...args) {
		const parent = this.#parent;
		if (!parent) {
			throw new Error('根节点不能有兄弟节点！');
		}
		const legalArgs = args.filter(arg => typeof arg === 'string' || !arg.contains(this));
		if (legalArgs.length < args.length) {
			console.error('Token.before: 会造成循环结构的节点未插入！');
		}
		parent.splice(parent.indexOf(this), 0, ...legalArgs);
		legalArgs.filter(arg => arg instanceof Token).forEach(token => {
			token.set('parent', parent);
		});
		return this;
	}

	append(...args) {
		const legalArgs = args.filter(arg => typeof arg === 'string' || arg !== this && !arg.contains(this));
		if (legalArgs.length < args.length) {
			console.error('Token.append: 会造成循环结构的节点未插入！');
		}
		this.push(...legalArgs);
		legalArgs.filter(arg => arg instanceof Token).forEach(token => {
			token.set('parent', this);
		});
		return this;
	}

	prepend(...args) {
		const legalArgs = args.filter(arg => typeof arg === 'string' || arg !== this && !arg.contains(this));
		if (legalArgs.length < args.length) {
			console.error('Token.prepend: 会造成循环结构的节点未插入！');
		}
		this.unshift(...legalArgs);
		legalArgs.filter(arg => arg instanceof Token).forEach(token => {
			token.set('parent', this);
		});
		return this;
	}

	appendTo(token) {
		if (this === token || this.contains(token)) {
			throw new RangeError('插入后将出现循环结构！');
		}
		this.#parent = token;
		token.push(this);
		return this;
	}

	prependTo(token) {
		if (this === token || this.contains(token)) {
			throw new RangeError('插入后将出现循环结构！');
		}
		this.#parent = token;
		token.unshift(this);
		return this;
	}

	clone(deep) {
		const copy = this.slice();
		if (!deep || this.children().length === 0) {
			return copy;
		}
		copy.forEach((token, i) => {
			if (token instanceof Token) {
				copy[i] = token.clone(true);
			}
		});
		return copy;
	}

	detach() {
		return this.remove();
	}

	remove() {
		const parent = this.#parent;
		if (!parent) {
			throw new Error('不能删除根节点！');
		}
		parent.splice(parent.indexOf(this), 1);
		return this;
	}

	insertAfter(token) {
		const parent = token.parent();
		if (!parent) {
			throw new RangeError('根节点不能有兄弟节点！');
		} else if (this.contains(token)) {
			throw new RangeError('插入后将出现循环结构！');
		}
		parent.splice(parent.indexOf(token) + 1, 0, this);
		this.#parent = parent;
		return this;
	}

	insertBefore(token) {
		const parent = token.parent();
		if (!parent) {
			throw new RangeError('根节点不能有兄弟节点！');
		} else if (this.contains(token)) {
			throw new RangeError('插入后将出现循环结构！');
		}
		parent.splice(parent.indexOf(token), 0, this);
		this.#parent = parent;
		return this;
	}

	replaceWith(token) {
		if (this === token) {
			return this;
		} else if (token instanceof Token && token.contains(this)) {
			throw new RangeError('替换后将出现循环结构！');
		}
		const parent = this.#parent;
		if (!parent) {
			throw new RangeError('不能替换根节点！');
		}
		parent[parent.indexOf(this)] = token;
		if (token instanceof Token) {
			token.set('parent', parent);
		}
		return this;
	}

	toArray() {
		return [...this];
	}

	// 引自mediawiki.Title::parse
	normalize(title, defaultNs = '') {
		/* eslint-disable no-param-reassign */
		let namespace = defaultNs;
		title = title.replaceAll('_', ' ').trim();
		if (title[0] === ':') {
			namespace = '';
			title = title.slice(1).trim();
		}
		const m = title.split(':');
		if (m.length > 1) {
			const id = this.#config.namespace[m[0].trim().toLowerCase()];
			if (id) {
				namespace = id;
				title = m.slice(1).join(':').trim();
			}
		}
		const i = title.indexOf('#');
		if (i !== -1) {
			title = title.slice(0, i).trim();
		}
		return `${namespace}${namespace && ':'}${ucfirst(title)}`;
		/* eslint-enable no-param-reassign */
	}

	sections(force) {
		if (this.type !== 'root') {
			return;
		}
		if (force || !this.#sections) {
			const headings = this.children('heading').map(heading => [this.indexOf(heading), heading.name]),
				lastHeading = new Array(6).fill(-1);
			this.#sections = new Array(headings.length);
			headings.forEach(([index, level], i) => {
				for (let j = level; j < 6; j++) {
					const last = lastHeading[j];
					if (last >= 0) {
						this.#sections[last] = this.slice(headings[last][0], index);
					}
					lastHeading[j] = j === level ? i : -1;
				}
			});
			lastHeading.filter(last => last >= 0).forEach(last => {
				this.#sections[last] = this.slice(headings[last][0]);
			});
			this.#sections.unshift(this.slice(0, headings[0]?.[0]));
		}
		return this.#sections;
	}

	section(n, force) {
		return this.sections(force)[n];
	}

	static warning = true;

	static warn(...args) {
		if (Token.warning) {
			console.warn(...args);
		}
	}

	static parse(wikitext, n, config) {
		wikitext = numberToString(wikitext); // eslint-disable-line no-param-reassign
		if (wikitext instanceof Token) {
			return wikitext.parse(n);
		} else if (typeof wikitext === 'string') {
			return new Token(wikitext, config).parse(n);
		}
		throw new TypeError('仅接受String作为输入参数！');
	}

	static normalize(title, defaultNs, config) {
		const token = new Token('', config);
		return token.normalize(title, defaultNs);
	}

	static createToken(type, ...args) {
		Token.warn('Token.createToken函数仅用于代码调试！');
		return new (classes[type] ?? Token)(...args);
	}

	static reload() {
		delete require.cache[require.resolve('./token')];
		return require('./token');
	}
}

/** @type {AtomToken} */
class AtomToken extends Token {
	constructor(wikitext, type, parent, accum) {
		super(wikitext, null, true, parent, accum);
		this.type = type;
		this.set('stage', MAX_STAGE);
	}

	update(str) {
		this[0] = str;
		return this;
	}
}

/** @type {AtomToken} */
class CommentToken extends AtomToken {
	closed = true;

	constructor(wikitext, accum) {
		wikitext = numberToString(wikitext); // eslint-disable-line no-param-reassign
		if (wikitext.endsWith('-->')) {
			super(wikitext.slice(0, -3), 'comment', null, accum);
		} else {
			super(wikitext, 'comment', null, accum);
			this.closed = false;
		}
	}

	toString() {
		return `<!--${this[0]}${this.closed ? '-->' : ''}`;
	}
}

/** @type {[AttributeToken, ?Token]} */
class ExtToken extends Token {
	type = 'ext';
	name;
	selfClosing;
	tags;

	constructor(matches, config, accum) {
		const [name, attr, inner] = matches;
		super(null, null, true, null, accum);
		this.name = name.toLowerCase();
		this.tags = [name];
		this.selfClosing = inner === '>';
		new AttributeToken(attr, 'ext-attr', this, []);
		if (this.selfClosing) {
			return;
		}
		this.tags.push(inner.slice(-1 - name.length, -1));
		const extInner = inner.slice(0, -3 - name.length);
		switch (this.name) {
			case 'ref': {
				const innerToken = new Token(extInner, config, true, this, accum);
				innerToken.type = 'ext-inner';
				break;
			}
			default:
				new AtomToken(extInner, 'ext-inner', this);
		}
	}

	toString() {
		return this.selfClosing
			? `<${this.tags[0]}${this[0]}/>`
			: `<${this.tags[0]}${this[0]}>${this[1]}</${this.tags[1]}>`;
	}

	getAttr(key) {
		return this[0].getAttr(key);
	}

	removeAttr(key) {
		this[0].removeAttr(key);
		return this;
	}

	setAttr(key, value) {
		this[0].setAttr(key, value);
		return this;
	}

	attr(...args) {
		if (args.length < 2) {
			return this.getAttr(...args);
		}
		return this.setAttr(...args);
	}

	empty() {
		this.length = 1;
		this.tags.length = 1;
		this.selfClosing = true;
		return this;
	}
}

/** @type {AtomToken} */
class AttributeToken extends AtomToken {
	#attr = {};

	constructor(attr, type, parent, accum) {
		if (attr.includes('>')) {
			throw new RangeError('扩展或HTML标签属性不能包含">"！');
		} else if (type !== 'ext-attr' && attr.includes('<')) {
			throw new RangeError('HTML标签属性不能包含"<"！');
		}
		super(attr, type, parent, accum);
		if (parent.name) {
			this.name = parent.name;
		}
		for (const [, key,, quoted, unquoted] of attr.matchAll(attrRegex)) {
			this.setAttr(key, quoted ?? unquoted ?? null, true);
		}
	}

	build() {
		super.build();
		if (this.type === 'ext-attr') {
			return;
		}
		const accum = this.get('accum');
		const buildOnce = str => str.split(/[\x00\x7f]/)
			.map((s, i) => i % 2 ? accum[s.replace(/!$/, '')].toString() : s).join('');
		for (let key in this.#attr) {
			const text = this.#attr[key];
			if (key.includes('\x00')) {
				delete this.#attr[key];
				key = buildOnce(key);
				this.#attr[key] = text;
			}
			if (text === true || !text.includes('\x00')) {
				continue;
			}
			this.#attr[key] = buildOnce(text);
		}
	}

	getAttr(key) {
		return key === undefined ? {...this.#attr} : this.#attr[key.toLowerCase().trim()];
	}

	empty() {
		this.#attr = {};
		return this.update('');
	}

	#updateFromAttr() {
		console.warn('这个方法会自动清除无效属性！');
		const str = Object.entries(this.#attr).map(([k, v]) => {
			if (v === true) {
				return k;
			}
			const quote = v.includes('"') ? "'" : '"';
			return `${k}=${quote}${v}${quote}`;
		}).join(' ');
		this.update(str && ` ${str}`);
	}

	removeAttr(key) {
		key = key.toLowerCase().trim(); // eslint-disable-line no-param-reassign
		if (key === undefined) {
			this.empty();
		} else if (key in this.#attr) {
			delete this.#attr[key];
			this.#updateFromAttr();
		}
		return this;
	}

	setAttr(key, value, init) {
		if (value === undefined) {
			return this.removeAttr(key);
		} else if (value.includes('>')) {
			throw new RangeError('扩展或HTML标签属性不能包含">"！');
		} else if (this.type !== 'ext-attr' && value.includes('<')) {
			throw new RangeError('HTML标签属性不能包含"<"！');
		}
		key = key.toLowerCase().trim(); // eslint-disable-line no-param-reassign
		if (attrNameRegex.test(key)) {
			this.#attr[key] = value === null ? true : value.replace(/\s/g, ' ').trim();
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

/** @type {[Token, ?Token]} */
class HeadingToken extends Token {
	type = 'heading';
	name;

	constructor(level, input, config, accum) {
		super(null, config, true, null, accum);
		this.name = String(level);
		input.forEach((text, i) => {
			if (text === '') {
				return;
			}
			const token = new Token(text, config, true, this, accum);
			token.type = i === 0 ? 'heading-title' : 'heading-trail';
			token.set('stage', 2);
		});
	}

	toString() {
		const equals = '='.repeat(this.name);
		return `${equals}${this[0]}${equals}${this[1] ?? ''}\n`;
	}

	update(title) {
		this[0] = title;
		return this;
	}

	level(n) {
		n = Math.min(Math.max(n, 1), 6); // eslint-disable-line no-param-reassign
		this.name = String(n);
		return this;
	}
}

/** @type {[AtomToken, ?Token]} */
class ArgToken extends Token {
	type = 'arg';
	name;

	constructor(parts, config, accum) {
		super(null, config, true, null, accum);
		parts.map(part => part.join('=')).forEach((part, i) => {
			if (i === 0 || i > 1) {
				new AtomToken(part, i === 0 ? 'arg-name' : 'arg-redundant', this, accum);
			} else {
				const token = new Token(part, config, true, this, accum);
				token.type = 'arg-default';
				token.set('stage', 2);
			}
		});
	}

	toString() {
		return `{{{${this.join('|')}}}}`;
	}

	rename(name) {
		this[0].update(name);
		this.name = removeComment(name);
		return this;
	}

	setDefault(token) {
		const test = Token.parse(`{{{|${token.toString}}}}`, 2, this.get('config'));
		if (test.length !== 1 || test[0].type !== 'arg' || test[0].length !== 2) {
			throw new SyntaxError(`Syntax error in triple-brace argument default: ${
				token.toString().replaceAll('\n', '\\n')
			}`);
		}
		if (typeof token === 'string') {
			token = test; // eslint-disable-line no-param-reassign
		} else {
			token.type = 'arg-default';
		}
		if (this.length > 1) {
			this[1].replaceWith(token);
			return this;
		}
		return this.append(token);
	}

	removeRedundant() {
		if (this.length > 2) {
			this.length = 2;
		}
		return this;
	}
}

/** @type {[AtomToken, ?ParameterToken]} */
class TranscludeToken extends Token {
	type = 'template';
	name;
	#keys;
	#args = new Map();

	constructor(parts, config, accum) {
		super(null, config, true, null, accum);
		const [title] = parts.shift();
		if (parts.length === 0 || title.includes(':')) {
			const [magicWord, ...arg] = title.split(':'),
				name = removeComment(magicWord),
				{parserFunction: [sensitive, insensitive]} = config;
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
			new AtomToken(title, 'template-name', this, accum);
		}
		let i = 1;
		parts.forEach(part => {
			if (part.length === 1) {
				part.unshift(i);
				i++;
			}
			new ParameterToken(...part, config, this, accum, false);
		});
	}

	toString() {
		return this.type === 'magic-word'
			? `{{${this[0]}${this.length > 1 ? ':' : ''}${this.slice(1).join('|')}}}`
			: `{{${this.join('|')}}}`;
	}

	getAnonArgs() {
		return this.slice(1).filter(({anon}) => anon);
	}

	getArgs(key) {
		let args = this.#args.get(key);
		if (!args) {
			args = this.slice(1).filter(({name}) => String(key) === name);
			this.#args.set(key, args);
		}
		return args;
	}

	getArg(key, any) {
		const args = this.getArgs(key);
		return (any ? args : args.filter(({anon}) => typeof key === 'number' ? anon : !anon)).at(-1);
	}

	getKeys() {
		this.#keys ||= new Set(this.slice(1).map(({name}) => name));
		return this.#keys;
	}

	getValues(key) {
		return this.getArgs(key).map(arg => arg.getValue());
	}

	getValue(key) {
		if (key !== undefined) {
			return this.getValues(key).at(-1);
		}
		return Object.fromEntries([...this.getKeys()].map(k => this.getValue(k)));
	}

	append(token) {
		super.append.call(this, token);
		if (token.anon) {
			token.name = String(this.getAnonArgs().length);
		}
		return this;
	}

	newAnonArg(value) {
		const test = Token.parse(`{{:T|${value}}}`, 2, this.get('config'));
		if (test.length !== 1 || !test[0].is('template#T') || test[0].length !== 2 || !test[0][1].anon) {
			throw new SyntaxError(`Syntax error in ${this.type} anonymous argument value: ${
				value.replaceAll('\n', '\\n')
			}`);
		}
		const [[, token]] = test;
		this.append(token); // 这一步同时更新token.name
		if (this.#keys) {
			this.#keys.add(token.name);
		}
		this.#args.set(token.name, token);
		return this;
	}

	setValue(key, value, i = this.length) {
		if (key === undefined) {
			return this.newAnonArg(value);
		}
		let arg = this.getArg(key, true);
		if (arg) {
			arg.setValue(value);
			return this;
		}
		i = Math.min(Math.max(i, 1), this.length); // eslint-disable-line no-param-reassign
		const test = Token.parse(`{{:T|${key}=${value}}}`, 2, this.get('config'));
		if (test.length !== 1 || !test[0].is('template#T') || test[0].length !== 2 || test[0][1].name !== key) {
			throw new SyntaxError(`Syntax error in ${this.type} argument value: ${
				value.toString().replaceAll('\n', '\\n')
			}`);
		}
		[[, arg]] = test; // 总是改写成命名参数
		this.splice(i, 0, arg);
		arg.set('parent', this);
		if (this.#keys) {
			this.#keys.add(arg.name);
		}
		this.#args.set(arg.name, arg);
		return this;
	}

	val(...args) {
		if (args.length < 2) {
			return this.getValue(...args);
		}
		return this.setValue(...args);
	}

	naming() {
		this.filter(({anon}) => anon).forEach(arg => {
			arg.unshift(new AtomToken(arg.name, 'parameter-key', arg));
			arg.anon = false;
		});
		return this;
	}

	removeArg(key) {
		this.getArgs(key).forEach(arg => {
			arg.remove();
		});
		this.#keys.delete(key);
		return this;
	}

	updateKey(oldKey, newKey) {
		if (!['ParameterToken.rename', 'ParameterToken.remove'].includes(caller())) {
			throw new Error('禁止外部调用TranscludeToken.updateKey方法！');
		}
		this.#args.delete(oldKey);
		if (newKey) {
			this.#keys.add(newKey);
			this.#args.delete(newKey);
		}
	}
}

/** @type {[?AtomToken, Token]} */
class ParameterToken extends Token {
	type = 'parameter';
	anon = false;
	name;
	#value;

	constructor(key, value, config, parent, accum = [], autofix = true) {
		if (autofix) {
			/* eslint-disable no-param-reassign */
			key = String(key);
			if (typeof value === 'number') {
				value = String(value);
			}
			/* eslint-enable no-param-reassign */
		}
		super(null, config, true, parent, accum);
		if (typeof key !== 'number') {
			new AtomToken(key, 'parameter-key', this, accum);
		} else {
			this.name = String(key);
			this.anon = true;
		}
		const token = new Token(value, config, true, this, accum);
		token.type = 'parameter-value';
		token.set('stage', 2);
	}

	toString() {
		return this.join('=');
	}

	remove() {
		this.parent().updateKey(this.name);
		return super.remove();
	}

	getValue() {
		if (this.#value === undefined) {
			this.#value = this.at(-1).toString().replace(/<!--.*?-->/g, '');
			if (!this.anon || this.parent()?.type === 'magic-word') {
				this.#value = this.#value.trim();
			}
		}
		return this.#value;
	}

	setValue(value) {
		const {anon} = this,
			test = Token.parse(`{{:T|${anon ? '' : '1='}${value}}}`, 2, this.get('config'));
		if (test.length !== 1 || !test[0].is('template#T') || test[0].length !== 2 || test[0][1].anon !== anon) {
			throw new SyntaxError(`Syntax error in template/magic-word argument value: ${
				value.replaceAll('\n', '\\n')
			}`);
		}
		this.at(-1).replaceWith(test[0][1].at(-1));
		this.#value = undefined;
		return this;
	}

	val(...args) {
		if (args.length === 0) {
			return this.getValue();
		}
		return this.setValue(args[0]);
	}

	rename(key, force) {
		if (this.anon) {
			throw new Error(`匿名参数 ${this.name} 不能简单地更名！`);
		}
		key = String(key); // eslint-disable-line no-param-reassign
		const name = removeComment(key),
			parent = this.parent(),
			keys = parent?.getKeys(); // 确保执行一次getKeys()
		if (this.name === name) {
			console.warn(`ParameterToken.rename: 未改变实际参数名 ${name}！`);
		} else if (keys?.has(name)) {
			const msg = `参数更名造成重复参数：${name}`;
			if (force) {
				console.warn(`ParameterToken.rename: ${msg}`);
			} else {
				throw new RangeError(msg);
			}
		}
		parent?.updateKey(this.name, name);
		this[0].update(key);
		this.name = name;
		return this;
	}
}

const classes = {
	atom: AtomToken,
	comment: CommentToken,
	ext: ExtToken,
	attribute: AttributeToken,
	arg: ArgToken,
	transclude: TranscludeToken,
	parameter: ParameterToken,
};

module.exports = Token;
