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
const ucfirst = str => `${str[0].toUpperCase()}${str.slice(1)}`.replaceAll('_', ' '),
	removeComment = str => str.replace(/<!--.*?-->|\x00\d+c\x7f/g, '').trim(),
	numberToString = n => typeof n === 'number' ? String(n) : n;
const caller = () => {
	try {
		throw new Error();
	} catch (e) {
		return e.stack.match(/(?<=^\s+at )[\w.]+(?= \()/gm)?.[2];
	}
};

class Token extends Array {
	type = 'root';
	#stage = 0; // 解析阶段，参见顶部注释
	#parent;
	#config;
	#accum;

	constructor(wikitext = null, config = require('./config.json'), halfParsed = false, parent = null, accum = []) {
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
			// no default
		}
	}

	get(key) {
		switch (key) {
			case 'accum':
				return this.#accum;
			case 'stage':
				return this.#stage;
			// no default
		}
	}

	slice(...args) {
		return [...this].slice(...args);
	}

	filter(...args) {
		return [...this].filter(...args);
	}

	splice(...args) {
		const arr = [...this],
			output = arr.splice(...args);
		this.length = 0;
		this.push(...arr);
		return output;
	}

	toString() {
		return this.join('');
	}

	parseOnce(n = this.#stage) {
		if (!['Token.parseOnce', 'Token.parse'].includes(caller())) {
			Token.warn('parseOnce方法一般不应直接调用，仅用于代码调试！');
		}
		if (n < this.#stage || this.length > 1 || typeof this[0] !== 'string') {
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
						innerEqual = syntax === '=' && top?.findEqual;
					if ([']]', '}-'].includes(syntax)) { // 情形1：闭合内链或转换
						lastIndex = curIndex + 2;
					} else if (syntax === '\n') { // 情形2：闭合标题
						lastIndex = curIndex + 1;
						/** @todo 生成标题Token */
					} else if (syntax === '|' || innerEqual) { // 情形3：模板内部，含行首单个'='
						top.parts.at(-1).push(text.slice(top.pos, curIndex));
						if (syntax === '|') {
							top.parts.push([]);
						}
						lastIndex = curIndex + 1;
						top.pos = lastIndex;
						top.findEqual = syntax === '|';
						stack.push(top);
					} else if (syntax.startsWith('}}')) { // 情形4：闭合模板
						const {0: open, index} = top;
						const close = syntax.slice(0, Math.min(open.length, 3)),
							rest = open.length - close.length;
						top.parts.at(-1).push(text.slice(top.pos, curIndex));
						lastIndex = curIndex + close.length;
						/* 标记{{!}} */
						let name = '';
						if (close.length === 2) {
							name = removeComment(top.parts[0][0]);
							name = name === '!' ? name : '';
						}
						/* 标记{{!}}结束 */
						text = `${text.slice(0, index + rest)}\x00${
							this.#accum.length
						}${name}\x7f${text.slice(lastIndex)}`;
						lastIndex = index + rest + 2 + String(this.#accum.length).length + name.length;
						if (close.length === 3) {
							new ArgToken(top.parts, this.#config, this.#accum);
						} else {
							new TranscludeToken(top.parts, this.#config, this.#accum);
						}
						if (rest > 1) {
							stack.push({0: open.slice(0, rest), index, pos: index + rest, parts: [[]]});
						} else if (rest === 1 && text[index - 1] === '-') {
							stack.push({0: '-{', index: index - 1, pos: index + 1, parts: [[]]});
						}
					} else { // 情形5：开启
						if (syntax.startsWith('{')) {
							mt.pos = curIndex + syntax.length;
							mt.parts = [[]];
						}
						if (top) {
							stack.push(top);
						}
						stack.push(mt);
						lastIndex = curIndex + syntax.length;
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
				throw new RangeError('参数应为0～10的整数！');
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.parseOnce(n);
			}
		}
		this.#stage++;
	}

	parse(n = MAX_STAGE) {
		if (n < MAX_STAGE && caller() !== 'ParameterToken.setValue') {
			Token.warn('指定解析层级的方法仅供熟练用户使用！');
		}
		while (this.#stage < n) {
			this.parseOnce(this.#stage);
		}
		this.build();
		this.each('arg, template, parameter', token => {
			if (token.name) {
				return;
			}
			token.name = removeComment(token[0].toString());
			if (token.type === 'template') {
				token.name = token.normalize(token.name, 'Template');
			}
		});
		return this;
	}

	build() {
		if (!['Token.build', 'Token.parse'].includes(caller())) {
			Token.warn('build方法一般不应直接调用，仅用于代码调试！');
		}
		this.#stage = MAX_STAGE;
		if (this.length !== 1 || typeof this[0] !== 'string' || !this[0].includes('\x00')) {
			return;
		}
		const text = this.pop();
		this.push(...text.split(/[\x00\x7f]/).map((str, i) => {
			if (i % 2 === 0) {
				return str;
			}
			const token = this.#accum[str.replace(/[c!]$/, '')];
			token.set('parent', this);
			return token;
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

	is(selector) {
		if (!selector?.trim()) {
			return true;
		}
		const selectors = selector.split(',').map(str => {
			const [type, ...name] = str.trim().split('#');
			return [type, name.join('#')];
		});
		return selectors.some(([type, name]) => (!type || this.type === type) && (!name || this.name === name));
	}

	parent(selector) {
		const parent = this.#parent;
		return parent?.is(selector) ? parent : null;
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

	children(selector) {
		return this.filter(token => token instanceof Token && token.is(selector));
	}

	search(selector) {
		return this.filter(token => token instanceof Token).flatMap(token => [
			...token.is(selector) ? [token] : [],
			...token.search(selector),
		]);
	}

	each(...args) {
		const selector = args.length > 1 ? args[0] : '',
			callback = args.at(-1),
			children = this.children();
		if (callback.constructor.name !== 'AsyncFunction') {
			if (this.is(selector)) {
				callback(this);
			}
			for (const token of children) {
				token.each(...args);
			}
			return;
		}
		return (async () => {
			if (this.is(selector)) {
				await callback(this);
			}
			for (const token of children) {
				await token.each(...args); // eslint-disable-line no-await-in-loop
			}
		})();
	}

	contains(token) {
		return this.includes(token) || this.children().some(child => child.contains(token));
	}

	replaceWith(token) {
		if (this === token) {
			return;
		} else if (token instanceof Token && token.contains(this)) {
			throw new RangeError('替换后将出现循环结构！');
		}
		const parent = this.parent();
		if (!parent) {
			throw new RangeError('不能替换根节点！');
		}
		parent[parent.indexOf(this)] = token;
		if (token instanceof Token) {
			token.set('parent', parent);
		}
	}

	remove() {
		const parent = this.parent();
		if (!parent) {
			throw new RangeError('不能删除根节点！');
		}
		parent.splice(parent.indexOf(this), 1);
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
		Token.warn('这个函数仅用于代码调试！');
		return new (classes[type] ?? Token)(...args);
	}

	static reload() {
		delete require.cache[require.resolve('./token')];
		return require('./token');
	}
}

/** @type {[string]} */
class AtomToken extends Token {
	constructor(wikitext, type, parent, accum) {
		super(wikitext, null, true, parent, accum);
		this.type = type;
		this.set('stage', MAX_STAGE);
	}

	update(str) {
		this[0] = str;
	}
}

/** @type {[string]} */
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
	}

	setAttr(key, value) {
		this[0].setAttr(key, value);
	}

	attr(...args) {
		return this[0].attr(...args);
	}

	empty() {
		this.length = 1;
		this.tags.length = 1;
		this.selfClosing = true;
	}
}

class AttributeToken extends AtomToken {
	#attr = {};

	constructor(attr, type, parent, accum) {
		if (attr.includes('>')) {
			throw new RangeError('扩展或HTML标签属性不能包含">"！');
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
		this.update('');
		this.#attr = {};
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
	}

	setAttr(key, value, init) {
		if (value === undefined) {
			this.removeAttr(key);
			return;
		}
		key = key.toLowerCase().trim(); // eslint-disable-line no-param-reassign
		if (attrNameRegex.test(key)) {
			this.#attr[key] = value === null ? true : value.replace(/\s/g, ' ').trim();
			if (!init) {
				this.#updateFromAttr();
			}
		}
	}

	attr(...args) {
		if (args.length < 2) {
			return this.getAttr(...args);
		}
		this.setAttr(...args);
	}
}

/** @type [AtomToken, ?Token] */
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
	}

	setDefault(token) {
		token.type = 'arg-default';
		if (this.length > 1) {
			this[1].replaceWith(token);
		} else {
			this.push(token);
			token.set('parent', this);
		}
	}

	removeRedundant() {
		if (this.length > 2) {
			this.length = 2;
		}
	}
}

/** @type [AtomToken, ?ParameterToken] */
class TranscludeToken extends Token {
	type = 'template';
	name;

	constructor(parts, config, accum) {
		super(null, config, true, null, accum);
		const [title] = parts.shift();
		if (parts.length === 0 || title.includes(':')) {
			const [magicWord, ...arg] = title.split(':'),
				name = removeComment(magicWord);
			if (config.parserFunction[1].includes(name) || config.parserFunction[0].includes(name.toLowerCase())) {
				this.name = name.toLowerCase().replace(/^#/, '');
				this.type = 'magic-word';
				new AtomToken(magicWord, 'magic-word-name', this, accum);
				if (arg.length) {
					parts.unshift([arg.join(':')]);
				}
			}
		}
		if (!this.name) {
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

	getArgs(key) {
		return this.filter(({name}) => String(key) === name);
	}

	getArg(key, any) {
		const args = this.getArgs(key);
		return (any ? args : args.filter(({anon}) => typeof key === 'number' ? anon : !anon)).at(-1);
	}

	getKeys() {
		return [...new Set(this.map(({name}) => name))];
	}

	getValues(key) {
		return this.getArgs(key).map(arg => arg.getValue());
	}

	getValue(key) {
		if (key !== undefined) {
			return this.getValues(key).at(-1);
		}
		return Object.fromEntries(this.getKeys().map(k => this.getValue(k)));
	}

	setValue(key, value, i = this.length) {
		let arg = this.getArg(key, true);
		if (arg) {
			arg.setValue(value);
			return;
		}
		i = Math.min(Math.max(i, 1), this.length); // eslint-disable-line no-param-reassign
		arg = new ParameterToken(key, value, null, this);
		arg.name = removeComment(String(key));
		this.splice(i, 0, arg);
	}

	val(...args) {
		if (args.length < 2) {
			return this.getValue(...args);
		}
		this.setValue(...args);
	}

	naming() {
		this.filter(({anon}) => anon).forEach(arg => {
			arg.unshift(new AtomToken(arg.name, 'parameter-key', arg));
			arg.anon = false;
		});
	}

	removeArg(key) {
		this.getArgs(key).forEach(arg => {
			arg.remove();
		});
	}
}

/** @type {[?AtomToken, ParameterValueToken]} */
class ParameterToken extends Token {
	type = 'parameter';
	anon = false;
	name;

	constructor(key, value, config, parent, accum = [], autofix = true) {
		if (autofix) {
			/* eslint-disable no-param-reassign */
			key = String(key);
			if (typeof value === 'number') {
				value = String(value);
			}
			/* eslint-enable no-param-reassign */
		} else if (typeof key === 'number' && value.includes('=')) {
			throw new RangeError('匿名参数中使用"="！');
		}
		super(null, config, true, parent, accum);
		if (typeof key !== 'number') {
			new AtomToken(key, 'parameter-key', this, accum);
		} else {
			this.name = String(key);
			this.anon = true;
		}
		new ParameterValueToken(value, config, this, accum);
	}

	toString() {
		return this.join('=');
	}

	getValue() {
		return this.at(-1).toString().replace(/<!--.*?-->/g, '').trim();
	}

	setValue(value) {
		if (this.anon) {
			const token = new Token(value.toString()).parse(2),
				plainToken = token.map((str, j) => [str, j])
					.filter(([str]) => typeof str === 'string' && str.includes('='));
			if (plainToken.length) {
				console.warn('匿名参数中使用"="！');
				plainToken.forEach(([str, j]) => {
					token[j] = str.replaceAll('=', '{{=}}');
				});
				value = token.toString(); // eslint-disable-line no-param-reassign
			}
		}
		this[this.length - 1] = value;
	}

	val(...args) {
		if (args.length === 0) {
			return this.getValue();
		}
		this.setValue(args[0]);
	}

	rename(key) {
		if (this.anon) {
			throw new Error('匿名参数不能简单地更名！');
		}
		key = String(key); // eslint-disable-line no-param-reassign
		this[0].update(key);
		this.name = removeComment(key);
	}
}

/** @type {[string]} */
class ParameterValueToken extends Token {
	type = 'parameter-value';

	constructor(value, config, parent, accum) {
		super(value, config, true, parent, accum);
		this.set('stage', 2);
	}

	isAnon() {
		return this.parent().anon;
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
	parameterValue: ParameterValueToken,
};

module.exports = Token;
