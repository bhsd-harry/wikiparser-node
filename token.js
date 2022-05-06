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

class Token extends Array {
	type = 'root';
	#stage = 0; // 解析阶段，参见顶部注释
	#parent;
	#atom = false;
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
			case 'atom':
				this.#atom = value;
				break;
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

	toString() {
		return this.join('');
	}

	parseOnce(n = this.#stage) {
		/* eslint-disable no-use-before-define */
		if (n < this.#stage) {
			return;
		} else if (n > this.#stage) {
			throw new RangeError('参数不应大于this.#stage！');
		}
		switch (n) {
			case 0: {
				const regex = new RegExp(
					`<!--.*?(?:-->|$)|<(${this.#config.ext.join('|')})(\\s.*?)?(/>|>.*?</\\1>)`,
					'gi',
				);
				this[0] = this[0].replace(regex, (substr, name, attr = '', inner = '') => {
					const token = name
						? new ExtToken([name, attr, inner.slice(1)], this.#config, this, this.#accum)
						: new CommentToken(substr.slice(4), this);
					this.#accum.push(token);
					return `\x00${this.#accum.length - 1}\x7f`;
				});
				break;
			}
			case 1: {
				const source = '\\[\\[|{{2,}|-{(?!{)',
					stack = [],
					closes = {'{': '}{2,}|\\|', '-': '}-', '[': ']]'};
				let [text] = this,
					regex = new RegExp(source, 'g'),
					mt = regex.exec(text),
					lastIndex;
				while (mt) {
					const {0: syntax, index: curIndex} = mt;
					if ([']', '}', '|'].includes(syntax[0])) {
						const top = stack.pop(),
							{0: open, index} = top;
						if (syntax === '|') {
							top.parts.push(text.slice(top.pos, curIndex));
							lastIndex = curIndex + 1;
							top.pos = lastIndex;
							stack.push(top);
						} else if (syntax.startsWith('}}')) {
							const close = syntax.slice(0, Math.min(open.length, 3)),
								rest = open.length - close.length;
							top.parts.push(text.slice(top.pos, curIndex));
							const token = close.length === 3
								? new ArgToken(top.parts, this.#config, this, this.#accum)
								: new TranscludeToken(top.parts, this.#config, this, this.#accum);
							lastIndex = curIndex + close.length;
							text = `${
								text.slice(0, index + rest)
							}\x00${this.#accum.length}\x7f${text.slice(lastIndex)}`;
							lastIndex = index + rest + 2 + String(this.#accum.length).length;
							this.#accum.push(token);
							if (rest > 1) {
								stack.push({0: open.slice(0, rest), index});
							}
						} else {
							lastIndex = curIndex + 2;
						}
					} else {
						if (syntax.startsWith('{')) {
							mt.pos = curIndex + syntax.length;
							mt.parts = [];
						}
						stack.push(mt);
						lastIndex = curIndex + syntax.length;
					}
					if (syntax !== '|') {
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
				this.each('arg, template', token => {
					token.name = token[0].toString().trim();
					if (token.type === 'template') {
						token.name = token.normalize(token.name, 'template');
					}
				});
				break;
			case 11:
				return;
			default:
				throw new RangeError('参数应为0～9的整数！');
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.parseOnce(n);
			}
		}
		this.#stage++;
		/* eslint-enable no-use-before-define */
	}

	parse(n = MAX_STAGE) {
		while (this.#stage < n) {
			this.parseOnce(this.#stage);
		}
		return this;
	}

	replace() {
		if (this.#atom || this.length !== 1 || typeof this[0] !== 'string') {
			return;
		}
		const text = this.pop();
		this.push(...text.split(/[\x00\x7f]/).map((str, i) => { // eslint-disable-line no-control-regex
			if (i % 2 === 0) {
				return str;
			}
			return this.#accum[str];
		}).filter(str => str !== ''));
		if (this.length === 0) {
			this.push('');
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.replace();
			}
		}
		return this; // 临时
	}

	is(selector) {
		if (!selector?.trim()) {
			return true;
		}
		const selectors = selector.split(',').map(str => str.trim().split('#'));
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

	find(selector) {
		return this.filter(token => token instanceof Token).flatMap(token => [
			...token.is(selector) ? [token] : [],
			...token.find(selector),
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
		} else if (token.contains(this)) {
			throw new RangeError('替换后将出现循环结构！');
		}
		const parent = this.parent();
		if (!parent) {
			throw new RangeError('根节点不能使用replaceWith方法！');
		}
		parent[parent.indexOf(this)] = token;
		token.set('parent', parent);
	}

	normalize(title, type) {
		const parts = title.split(':');
		let noPrefix;
		if (parts[0].trim() === '') {
			parts.unshift();
		} else {
			noPrefix = true;
		}
		parts[0] = parts[0].trim();
		if (parts.length > 2) {
			parts.length = 2;
			parts[1] = parts.slice(1).join(':').trim();
		}
		const canonicalNs = this.#config.namespace[parts[0].toLowerCase().replaceAll(' ', '_')];
		if (canonicalNs) {
			return `${canonicalNs}:${ucfirst(parts[1])}`;
		} else if (noPrefix && type === 'template') {
			return `Template:${ucfirst(parts.join(':'))}`;
		}
		return ucfirst(parts.join(':'));
	}

	static parse(wikitext) {
		if (wikitext instanceof Token) {
			return wikitext.parse();
		} else if (typeof wikitext === 'string') {
			return new Token(wikitext).parse();
		}
		throw new TypeError('仅接受String作为输入参数！');
	}
}

class AtomToken extends Token {
	type = 'plain';

	constructor(wikitext, type, parent) {
		super(wikitext, null, true, parent);
		this.type = type;
		this.set('atom', true);
		this.set('stage', MAX_STAGE);
	}

	update(str) {
		this[0] = str;
	}
}

class CommentToken extends AtomToken {
	closed = true;

	constructor(wikitext, parent) {
		if (wikitext.endsWith('-->')) {
			super(wikitext.slice(0, -3), 'comment', parent);
		} else {
			super(wikitext, 'comment', parent);
			this.closed = false;
		}
	}

	toString() {
		return `<!--${this[0]}${this.closed ? '-->' : ''}`;
	}
}

class ExtToken extends Token {
	type = 'ext';
	name;
	selfClosing;
	tags;

	constructor(matches, config, parent, accum) {
		const [name, attr, inner] = matches;
		super('', null, true, parent);
		this.name = name.toLowerCase();
		this.tags = [name];
		this.selfClosing = inner === '>';
		this.set('stage', MAX_STAGE);
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

class ArgToken extends Token {
	type = 'arg';
	name;

	constructor(parts, config, parent, accum) {
		super('', config, true, parent, accum);
		this.pop();
		this.push(...parts.map((part, i) => {
			if (i > 1) {
				return new AtomToken(part, 'arg-redundant', this);
			}
			const token = new Token(part, config, true, this, accum);
			token.type = i === 0 ? 'arg-name' : 'arg-default';
			token.set('stage', i === 0 ? MAX_STAGE : 2);
			accum.push(token);
			return token;
		}));
		this.set('stage', 2);
	}

	toString() {
		return `{{{${this.join('|')}}}}`;
	}
}

class TranscludeToken extends Token {
	type;
	name;

	constructor(parts, config, parent, accum) {
		super('', config, true, parent, accum);
		this.pop();
		if (parts.length === 1 || parts[0].includes(':')) {
			const [magicWord, ...arg] = parts[0].split(':'),
				name = magicWord.trim();
			if (config.parserFunction[1].includes(name) || config.parserFunction[0].includes(name.toLowerCase())) {
				this.name = name.toLowerCase().replace(/^#/, '');
				this.type = 'magic-word';
				this.function = magicWord;
				if (arg.length) {
					parts[0] = arg.join(':');
				} else {
					parts.length = 0;
				}
			}
		}
		this.type ||= 'template';
		this.push(...parts.map((part, i) => {
			const token = new Token(part, config, true, this, accum);
			token.type = i === 0 && this.type === 'template' ? 'transclude-name' : 'transclude-arg';
			token.set('stage', token.type === 'transclude-name' ? MAX_STAGE : 2);
			accum.push(token);
			return token;
		}));
		this.set('stage', 2);
	}

	toString() {
		return `{{${this.function ?? ''}${this.function && this.length ? ':' : ''}${this.join('|')}}}`;
	}
}

module.exports = Token;
