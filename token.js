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

class Token extends Array {
	type = 'root';
	#stage = 0; // 解析阶段，参见顶部注释
	#parent;
	#atom = false;
	#stack = [];
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
			case 1:
				break;
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
				this.replace();
				break;
			case 10:
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

	static parse(wikitext) {
		if (wikitext instanceof Token) {
			return wikitext.parse();
		} else if (typeof wikitext === 'string') {
			return new Token(wikitext).parse(1).replace();
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
		super(attr, null, true, parent);
		this.name = name.toLowerCase();
		this.tags = [name];
		this.selfClosing = inner === '>';
		this.set('stage', MAX_STAGE);
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
				this.set('atom', true);
		}
	}

	toString() {
		return this.selfClosing
			? `<${this.tags[0]}${this[0]}/>`
			: `<${this.tags[0]}${this[0]}>${this[1]}</${this.tags[1]}>`;
	}
}

module.exports = Token;
