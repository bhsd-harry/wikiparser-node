/**
 * PHP解析器的步骤：
 * -1. 替换签名和{{subst:}}，参见Parser::preSaveTransform；这在revision中不可能保留，可以跳过
 * 0. 移除特定字符\x00和\x7f，参见Parser::parse
 * 1. 注释/扩展标签（'<'相关），参见Preprocessor_Hash::buildDomTreeArrayFromText
 * 2. 模板/模板变量，注意rightmost法则，以及'-{'和'[['可以破坏'{{'或'{{{'语法，
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

const MAX_STAGE = 11;
const ucfirst = str => `${str[0].toUpperCase()}${str.slice(1)}`.replaceAll('_', ' ');
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

	constructor(wikitext, config = require('./config.json'), halfParsed = false, parent = null, accum = []) {
		if (typeof wikitext === 'string') {
			// eslint-disable-next-line no-control-regex
			super(halfParsed ? wikitext : wikitext.replace(/[\x00\x7f]/g, ''));
		} else {
			throw new TypeError('仅接受String作为输入参数！');
		}
		this.#parent = parent;
		this.#config = config;
		this.#accum = accum;
	}

	set(key, value) {
		switch (key) { // eslint-disable-line default-case
			case 'stage':
				this.#stage = value;
				break;
			case 'parent':
				this.#parent = value;
		}
	}

	get(key) {
		switch (key) { // eslint-disable-line default-case
			case 'accum':
				return this.#accum;
			case 'stage':
				return this.#stage;
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
		const thisCaller = caller();
		if (!['Token.parseOnce', 'Token.parse'].includes(thisCaller)) {
			console.warn('这个方法仅用于代码调试！', thisCaller);
		}
		if (n < this.#stage || this.length > 1 || typeof this[0] !== 'string') {
			return;
		} else if (n > this.#stage) {
			throw new RangeError('参数不应大于this.#stage！');
		}
		/* eslint-disable no-use-before-define */
		switch (n) {
			case 0: {
				const regex = new RegExp(
					`<!--.*?(?:-->|$)|<(${this.#config.ext.join('|')})(\\s.*?)?(/>|>.*?</\\1>)`,
					'gi',
				);
				this[0] = this[0].replace(regex, (substr, name, attr = '', inner = '') => {
					const token = name
						? new ExtToken([name, attr, inner.slice(1)], this.#config, this.#accum)
						: new CommentToken(substr.slice(4));
					this.#accum.push(token);
					return `\x00${this.#accum.length - 1}\x7f`;
				});
				break;
			}
			case 1: {
				const source = '\\[\\[|{{2,}|-{(?!{)',
					stack = [],
					closes = {'{': '}{2,}|[|=]', '-': '}-', '[': ']]'};
				let [text] = this,
					regex = new RegExp(source, 'g'),
					mt = regex.exec(text),
					lastIndex;
				while (mt) {
					const {0: syntax, index: curIndex} = mt,
						innerSyntax = ['|', '='].includes(syntax);
					if ([']', '}', '|', '='].includes(syntax[0])) {
						const top = stack.pop(),
							{0: open, index} = top;
						if (innerSyntax) {
							top.parts.at(-1).push(text.slice(top.pos, curIndex));
							if (syntax === '|') {
								top.parts.push([]);
							}
							lastIndex = curIndex + 1;
							top.pos = lastIndex;
							stack.push(top);
						} else if (syntax.startsWith('}}')) {
							const close = syntax.slice(0, Math.min(open.length, 3)),
								rest = open.length - close.length;
							top.parts.at(-1).push(text.slice(top.pos, curIndex));
							const token = close.length === 3
								? new ArgToken(top.parts, this.#config, this.#accum)
								: new TranscludeToken(top.parts, this.#config, this.#accum);
							lastIndex = curIndex + close.length;
							text = `${
								text.slice(0, index + rest)
							}\x00${this.#accum.length}\x7f${text.slice(lastIndex)}`;
							lastIndex = index + rest + 2 + String(this.#accum.length).length;
							this.#accum.push(token);
							if (rest > 1) {
								stack.push({0: open.slice(0, rest), index, pos: index + rest, parts: [[]]});
							} else if (rest === 1 && text[index - 1] === '-') {
								stack.push({0: '-{', index: index - 1, pos: index + 1, parts: [[]]});
							}
						} else {
							lastIndex = curIndex + 2;
						}
					} else {
						if (syntax.startsWith('{')) {
							mt.pos = curIndex + syntax.length;
							mt.parts = [[]];
						}
						stack.push(mt);
						lastIndex = curIndex + syntax.length;
					}
					if (!innerSyntax) {
						regex = new RegExp(stack.length ? `${source}|${closes[stack.at(-1)[0][0]]}` : source, 'g');
					}
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
				this.replace();
				this.each('arg, template, transclude-arg', token => {
					if (token.name) {
						return;
					}
					token.name = token[0].toString().trim();
					if (token.type === 'template') {
						token.name = token.normalize(token.name, 'Template');
					}
				});
				break;
			case 11:
				return;
			default:
				throw new RangeError('参数应为0～9的整数！');
		}
		/* eslint-enable no-use-before-define */
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.parseOnce(n);
			}
		}
		this.#stage++;
	}

	parse(n = MAX_STAGE) {
		const thisCaller = caller();
		if (n < MAX_STAGE && thisCaller !== 'TranscludeToken.setValue') {
			console.warn('这个方法仅用于代码调试！', thisCaller);
		}
		while (this.#stage < n) {
			this.parseOnce(this.#stage);
		}
		return this;
	}

	replace() {
		const thisCaller = caller();
		if (!['Token.replace', 'Token.parseOnce'].includes(thisCaller)) {
			console.warn('这个方法仅用于代码调试！', thisCaller);
		}
		if (this.length !== 1 || typeof this[0] !== 'string' || !this[0].includes('\x00')) {
			return;
		}
		const text = this.pop();
		this.push(...text.split(/[\x00\x7f]/).map((str, i) => { // eslint-disable-line no-control-regex
			if (i % 2 === 0) {
				return str;
			}
			const token = this.#accum[str];
			token.set('parent', this);
			return token;
		}).filter(str => str !== ''));
		if (this.length === 0) {
			this.push('');
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.replace();
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
			throw new RangeError('根节点不能使用replaceWith方法！');
		}
		parent[parent.indexOf(this)] = token;
		if (token instanceof Token) {
			token.set('parent', parent);
		}
	}

	// 引自mediawiki.Title::parse
	normalize(title, defaultNs = '') {
		/* eslint-disable no-param-reassign */
		const rUnderscoreTrim = /^_+|_+$/g,
			rWhitespace = /[ _\xa0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g,
			rSplit = /^(.+?)_*:_*(.*)$/;
		let namespace = defaultNs;
		title = title.replace(rWhitespace, '_').replace(rUnderscoreTrim, '');
		if (title[0] === ':') {
			namespace = '';
			title = title.slice(1).replace(rUnderscoreTrim, '');
		}
		const m = title.match(rSplit);
		if (m) {
			const id = this.#config.namespace[m[1].toLowerCase()];
			if (id) {
				namespace = id;
				[,, title] = m;
			}
		}
		const i = title.indexOf('#');
		if (i !== -1) {
			title = title.slice(0, i).replace(rUnderscoreTrim, '');
		}
		if (title === '' || title[0] === ':') {
			return '';
		}
		return `${namespace}${namespace && ':'}${ucfirst(title)}`;
		/* eslint-enable no-param-reassign */
	}

	static parse(wikitext, config) {
		if (wikitext instanceof Token) {
			return wikitext.parse();
		} else if (typeof wikitext === 'string') {
			return new Token(wikitext, config).parse();
		}
		throw new TypeError('仅接受String作为输入参数！');
	}

	static normalize(title, defaultNs, config) {
		const token = new Token('', config);
		return token.normalize(title, defaultNs);
	}

	static createToken(type, ...args) {
		console.warn('这个函数仅用于代码调试！');
		return new (classes[type] ?? Token)(...args);
	}

	static reload() {
		delete require.cache[require.resolve('./token')];
		return require('./token');
	}
}

/** @type {[string]} */
class AtomToken extends Token {
	type = 'plain';

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

	constructor(wikitext) {
		if (wikitext.endsWith('-->')) {
			super(wikitext.slice(0, -3), 'comment', null);
		} else {
			super(wikitext, 'comment', null);
			this.closed = false;
		}
	}

	toString() {
		return `<!--${this[0]}${this.closed ? '-->' : ''}`;
	}
}

/** @type {[Token, ?Token]} */
class ExtToken extends Token {
	type = 'ext';
	name;
	selfClosing;
	tags;

	constructor(matches, config, accum) {
		const [name, attr, inner] = matches;
		super('', null, true);
		this.name = name.toLowerCase();
		this.tags = [name];
		this.selfClosing = inner === '>';
		const attrToken = new Token(attr, config, true, this, accum);
		attrToken.type = 'ext-attr';
		attrToken.set('stage', MAX_STAGE - 1);
		this[0] = attrToken;
		accum.push(attrToken);
		if (this.selfClosing) {
			return;
		}
		this.tags.push(inner.slice(-1 - name.length, -1));
		const extInner = inner.slice(0, -3 - name.length);
		switch (this.name) {
			case 'ref': {
				const innerToken = new Token(extInner, config, true, this, accum);
				innerToken.type = 'ext-inner';
				this.push(innerToken);
				accum.push(innerToken);
				break;
			}
			default:
				this.push(new AtomToken(extInner, 'ext-inner', this));
		}
	}

	toString() {
		return this.selfClosing
			? `<${this.tags[0]}${this[0]}/>`
			: `<${this.tags[0]}${this[0]}>${this[1]}</${this.tags[1]}>`;
	}
}

/** @type [Token, ?Token] */
class ArgToken extends Token {
	type = 'arg';
	name;

	constructor(parts, config, accum) {
		super('', config, true, null, accum);
		this.pop();
		parts = parts.map(part => part.join('=')); // eslint-disable-line no-param-reassign
		this.push(...parts.map((part, i) => {
			let token;
			if (i === 0 || i > 1) {
				token = new AtomToken(part, i === 0 ? 'arg-name' : 'arg-redundant', this, accum);
			} else {
				token = new Token(part, config, true, this, accum);
				token.type = 'arg-default';
				token.set('stage', 2);
			}
			accum.push(token);
			return token;
		}));
	}

	toString() {
		return `{{{${this.join('|')}}}}`;
	}
}

/** @type [?Token] */
class TranscludeToken extends Token {
	type = 'template';
	name;

	constructor(parts, config, accum) {
		super('', config, true, null, accum);
		this.pop();
		parts[0] = parts[0].join('=');
		if (parts.length === 1 || parts[0].includes(':')) {
			const [magicWord, ...arg] = parts[0].split(':'),
				name = magicWord.trim();
			if (config.parserFunction[1].includes(name) || config.parserFunction[0].includes(name.toLowerCase())) {
				this.name = name.toLowerCase().replace(/^#/, '');
				this.type = 'magic-word';
				this.function = magicWord;
				if (arg.length) {
					parts[0] = [arg.join(':')];
				} else {
					parts.length = 0;
				}
			}
		}
		if (this.type === 'template') {
			const part = parts.shift();
			this.push(new AtomToken(part, 'template-name', this, accum));
			accum.push(this[0]);
		}
		let i = 1;
		parts.map(([key, ...value]) => value.length ? [key, value.join('=')] : [key]).forEach(part => {
			if (part.length === 1) {
				part.unshift(i);
				i++;
			}
			// eslint-disable-next-line no-use-before-define
			const token = new TranscludeArgToken(...part, config, this, accum, false);
			accum.push(token);
			this.push(token);
		});
	}

	toString() {
		return `{{${this.function ?? ''}${this.function && this.length ? ':' : ''}${this.join('|')}}}`;
	}

	getArgs(k) {
		return this.filter(({name}) => String(k) === name);
	}

	getArg(k, any) {
		const args = this.getArgs(k);
		return (any ? args : args.filter(({anon}) => typeof k === 'number' ? anon : !anon)).at(-1);
	}

	getValues(k) {
		return this.getArgs(k).map(arg => arg.at(-1).toString()[arg.anon ? 'trimEnd' : 'trim']());
	}

	getValue(k) {
		return this.getValues(k).at(-1);
	}

	setValue(key, value, i = this.length) {
		const arg = this.getArg(key, true);
		if (arg) {
			if (arg.anon) {
				const token = new Token(value.toString()).parse(2);
				if (token[0].includes('=')) {
					throw new RangeError('匿名参数中使用"="！');
				}
			}
			arg[arg.length - 1] = value;
			return;
		}
		i = Math.min(Math.max(i, 1), this.length); // eslint-disable-line no-param-reassign
		const token = new TranscludeArgToken(key, value, null, this); // eslint-disable-line no-use-before-define
		token.name = String(key).trim();
		this.splice(i, 0, token);
	}
}

/** @type {[?Token, Token]} */
class TranscludeArgToken extends Token {
	type = 'transclude-arg';
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
		super('', config, true, parent, accum);
		if (typeof key !== 'number') {
			this[0] = new AtomToken(key, 'transclude-arg-key', this, accum);
			accum.push(this[0]);
		} else {
			this.name = String(key);
			this.anon = true;
			this.pop();
		}
		const token = new Token(value, config, true, this, accum);
		token.type = 'transclude-arg-value';
		token.set('stage', 2);
		accum.push(token);
		this.push(token);
	}

	toString() {
		return this.join('=');
	}
}

const classes = {
	atom: AtomToken,
	comment: CommentToken,
	ext: ExtToken,
	arg: ArgToken,
	transclude: TranscludeToken,
	transcludeArg: TranscludeArgToken,
};

module.exports = Token;
