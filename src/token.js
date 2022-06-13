'use strict';

/*
 * PHP解析器的步骤：
 * -1. 替换签名和`{{subst:}}`，参见Parser::preSaveTransform；这在revision中不可能保留，可以跳过
 * 0. 移除特定字符`\x00`和`\x7f`，参见Parser::parse
 * 1. 注释/扩展标签（'<'相关），参见Preprocessor_Hash::buildDomTreeArrayFromText和Sanitizer::decodeTagAttributes
 * 2. 模板/模板变量/标题，注意rightmost法则，以及`-{`和`[[`可以破坏`{{`或`{{{`语法，
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
 * c: CommentToken、NoIncludeToken和IncludeToken
 * !: `{{!}}`专用
 * t: ArgToken或TranscludeToken
 * h: HeadingToken
 * x: HtmlToken
 */

const {typeError, externalUse, debugOnly} = require('../util/debug'),
	{removeComment} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	{MAX_STAGE} = Parser,
	AstElement = require('../lib/element'),
	{Ranges} = require('../lib/range'),
	assert = require('assert/strict');

class Token extends AstElement {
	type = 'root';
	/** 解析阶段，参见顶部注释。只对plain Token有意义。 */ #stage = 0;
	/** @type {ParserConfig} */ #config;
	/**
	 * 这个数组起两个作用：1. 数组中的Token会在build时替换`/\x00\d+.\x7f/`标记；2. 数组中的Token会依次执行parseOnce和build方法。
	 * @type {accum}
	 */
	#accum;
	/** @type {Record<string, Ranges>} */ #acceptable;
	#protectedChildren = new Ranges();

	/**
	 * @param {?string} wikitext
	 * @param {accum} accum
	 * @param {acceptable} acceptable
	 */
	constructor(wikitext, config = Parser.getConfig(), halfParsed = false, accum = [], acceptable = null) {
		super();
		if (typeof wikitext === 'string') {
			this.insertAt(halfParsed ? wikitext : wikitext.replace(/[\x00\x7f]/g, ''), 0, true);
		} else if (wikitext !== undefined) {
			typeError('String');
		}
		this.setAttribute('config', config).setAttribute('accum', accum).setAttribute('acceptable', acceptable);
		accum.push(this);
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (!Parser.debugging && ['stage', 'config', 'accum', 'acceptable', 'protectedChildren'].includes(key)
			&& externalUse('getAttribute')
		) {
			throw new RangeError(`使用 ${this.constructor.name}.getAttribute 方法获取私有属性 ${key} 仅用于代码调试！`);
		}
		switch (key) {
			case 'stage':
				return this.#stage;
			case 'config':
				return this.#config;
			case 'accum':
				return this.#accum;
			case 'acceptable':
				return this.#acceptable;
			case 'protectedChildren':
				return this.#protectedChildren;
			default:
				return super.getAttribute(key);
		}
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
	 */
	setAttribute(key, value) {
		if (!Parser.debugging && ['stage', 'config', 'accum', 'acceptable', 'protectedChildren'].includes(key)
			&& externalUse('setAttribute')
		) {
			throw new RangeError(`使用 ${this.constructor.name}.setAttribute 方法设置私有属性 ${key} 仅用于代码调试！`);
		}
		switch (key) {
			case 'stage':
				if (typeof value !== 'number') {
					typeError('Number');
				} else if (!Number.isInteger(value) || value < 0 || value > MAX_STAGE) {
					throw new RangeError(`非法的解析层级：${value}！`);
				} else if (value > 0 && this.#stage === 0 && this.type === 'root') {
					this.#accum.shift();
				}
				this.#stage = value;
				return this;
			case 'config':
				if (typeof value !== 'object') {
					typeError('Object');
				}
				this.#config = value;
				return this;
			case 'accum':
				if (!Array.isArray(value)) {
					typeError('Array');
				} else if (value.some(ele => !(ele instanceof Token))) {
					typeError('Token');
				}
				this.#accum = value;
				return this;
			case 'acceptable':
				if (typeof value !== 'object') {
					typeError('Object');
				} else if (value) {
					for (const [k, v] of Object.entries(value)) {
						value[k] = v instanceof Ranges ? v : new Ranges(v);
					}
				}
				this.#acceptable = value;
				return this;
			case 'protectedChildren':
				if (!(value instanceof Ranges)) {
					typeError('Ranges');
				}
				this.#protectedChildren = value;
				return this;
			default:
				return super.setAttribute(key, value);
		}
	}

	isPlain() {
		return this.constructor === Token;
	}

	/** @param {...string|number} args */
	protectChildren(...args) {
		if (!Parser.debugging && externalUse('protectChildren')) {
			debugOnly(this.constructor, 'protectChildren');
		}
		const ranges = new Ranges(args);
		this.#protectedChildren.extend(ranges);
	}

	/**
	 * @param {number} i
	 * @returns {string|Token}
	 */
	removeAt(i) {
		const protectedIndices = this.#protectedChildren.applyTo(this.childNodes);
		if (protectedIndices.includes(i)) {
			throw new Error(`${this.constructor.name} 的第 ${i} 个子节点不可移除！`);
		} else if (this.#acceptable) {
			const acceptableIndices = Object.fromEntries(
					Object.entries(this.#acceptable).map(([str, ranges]) => [str, ranges.applyTo(this.childNodes)]),
				),
				nodesAfter = this.childNodes.slice(i + 1);
			if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name].includes(i + j))) {
				throw new Error(`移除 ${this.constructor.name} 的第 ${i} 个子节点会破坏规定的顺序！`);
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 */
	insertAt(token, i = this.childNodes.length) {
		if (this.#acceptable) {
			const acceptableIndices = Object.fromEntries(
					Object.entries(this.#acceptable).map(([str, ranges]) => [str, ranges.applyTo(this.childNodes)]),
				),
				nodesAfter = this.childNodes.slice(i);
			if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name].includes(i + j + 1))) {
				throw new Error(`${this.constructor.name} 插入新的第 ${i} 个子节点会破坏规定的顺序！`);
			}
		}
		super.insertAt(token, i);
		if (token instanceof Token && token.type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	/** @param {Token} token */
	safeReplaceWith(token) {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		const acceptable = parentNode.getAttribute('acceptable');
		if (!acceptable || Object.values(acceptable).every(ranges => {
			const /** @type {RangesSpread} */ [{start, end, step}] = ranges;
			return start === 0 && end === Infinity && step === 1;
		})) {
			Parser.warn(`父节点为 ${parentNode.constructor.name}，退化到 replaceWith 方法。`);
			return this.replaceWith(token);
		} else if (token.constructor !== this.constructor) {
			typeError(this.constructor.name);
		}
		try {
			assert.deepEqual(token.getAttribute('acceptable'), this.#acceptable);
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new Error(`待替换的 ${this.constructor.name} 带有不同的 #acceptable 属性！`);
			}
			throw e;
		}
		const i = parentNode.childNodes.indexOf(this);
		super.removeAt.call(parentNode, i);
		super.insertAt.call(parentNode, token, i);
		if (token.type === 'root') {
			token.type = 'plain';
		}
		const e = new Event('replace', {bubbles: true});
		token.dispatchEvent(e, {position: i, oldToken: this, newToken: token});
	}

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
		return `${namespace}${namespace && ':'}${title && `${title[0].toUpperCase()}${title.slice(1)}`}`;
	}

	sections() {
		if (this.type !== 'root') {
			return;
		}
		const {childNodes} = this,
			headings = [...childNodes.entries()]
				.filter(([, child]) => child instanceof Token && child.type === 'heading')
				.map(/** @param {[number, Token]} */ ([i, {name}]) => [i, Number(name)]),
			lastHeading = [-1, -1, -1, -1, -1, -1];
		const /** @type {(string|Token)[][]} */ sections = new Array(headings.length);
		for (const [i, [index, level]] of headings.entries()) {
			for (let j = level; j < 6; j++) {
				const last = lastHeading[j];
				if (last >= 0) {
					sections[last] = childNodes.slice(headings[last][0], index);
				}
				lastHeading[j] = j === level ? i : -1;
			}
		}
		for (const last of lastHeading) {
			if (last >= 0) {
				sections[last] = childNodes.slice(headings[last][0]);
			}
		}
		sections.unshift(childNodes.slice(0, headings[0]?.[0]));
		return sections;
	}

	/** @param {number} n */
	section(n) {
		if (typeof n !== 'number') {
			typeError('Number');
		}
		return this.sections()[n];
	}

	isTemplate() {
		return this.type === 'template' || this.type === 'magic-word' && this.name === 'invoke';
	}

	/** 将维基语法替换为占位符 */
	parseOnce(n = this.#stage, include = false) {
		if (!Parser.debugging && externalUse('parseOnce')) {
			debugOnly(this.constructor, 'parseOnce');
		} else if (typeof n !== 'number') {
			typeError('Number');
		} else if (n < this.#stage || !this.isPlain() || this.childNodes.length === 0) {
			return;
		} else if (n > this.#stage) {
			throw new RangeError(`当前解析层级为 ${this.#stage}，无法越级解析！`);
		}
		switch (n) {
			case 0:
				if (this.type === 'root') {
					this.#accum.shift();
				}
				this.#parseCommentAndExt(include);
				break;
			case 1:
				this.#parseBrackets();
				break;
			case 2:
				this.#parseHtml();
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
				throw new RangeError(`解析层级应为 0 ~ ${MAX_STAGE} 的整数！`);
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.parseOnce(n, include);
			}
		}
		this.#stage++;
		return this;
	}

	#parseCommentAndExt(includeOnly = false) {
		let /** @type {string} */ text = this.firstChild;
		const onlyinclude = /<onlyinclude>(.*?)<\/onlyinclude>/gs;
		if (includeOnly && onlyinclude.test(text)) { // `<onlyinclude>`拥有最高优先级
			onlyinclude.lastIndex = 0;
			text = text.replace(
				onlyinclude,
				/** @param {string} inner */ (_, inner) => {
					const str = `\x00${this.#accum.length}e\x7f`,
						OnlyincludeToken = require('./onlyincludeToken');
					new OnlyincludeToken(inner, this.#config, this.#accum);
					return str;
				},
			).replace(/(?<=^|\x00\d+e\x7f).*?(?=$|\x00\d+e\x7f)/gs, substr => {
				if (substr === '') {
					return '';
				}
				const NoincludeToken = require('./nowikiToken/noincludeToken');
				new NoincludeToken(substr, this.#accum);
				return `\x00${this.#accum.length - 1}c\x7f`;
			});
			this.replaceChildren(text);
			return;
		}
		const regex = new RegExp(
			includeOnly
				? `<!--.*?(?:-->|$)|<includeonly(?:\\s.*?)?>|</includeonly\\s*>|<(${
					this.#config.ext.join('|')
				})(\\s.*?)?(?:/>|>(.*?)</(\\1\\s*)>)|<(noinclude)(\\s.*?)?(?:/>|>(.*?)(?:</(\\5\\s*)>|$))`
				: `<!--.*?(?:-->|$)|<(?:no|only)include(?:\\s.*?)?>|</(?:no|only)include\\s*>|<(${
					this.#config.ext.join('|')
				})(\\s.*?)?(?:/>|>(.*?)</(\\1\\s*)>)|<(includeonly)(\\s.*?)?(?:/>|>(.*?)(?:</(\\5\\s*)>|$))`,
			'gis',
		);
		text = text.replace(
			regex,
			/** @type {function(...string): string} */
			(substr, name, attr, inner, closing, include, includeAttr, includeInner, includeClosing) => {
				const str = `\x00${this.#accum.length}${name ? 'e' : 'c'}\x7f`;
				if (name) {
					const ExtToken = require('./tagPairToken/extToken');
					new ExtToken(name, attr, inner, closing, this.#config, this.#accum);
				} else if (substr.startsWith('<!--')) {
					const CommentToken = require('./nowikiToken/commentToken'),
						closed = substr.endsWith('-->');
					new CommentToken(substr.slice(4, closed ? -3 : undefined), closed, this.#accum);
				} else if (include) {
					const IncludeToken = require('./tagPairToken/includeToken');
					new IncludeToken(include, includeAttr, includeInner, includeClosing, this.#accum);
				} else {
					const NoincludeToken = require('./nowikiToken/noincludeToken');
					new NoincludeToken(substr, this.#accum);
				}
				return str;
			},
		);
		this.replaceChildren(text);
	}

	#parseBrackets() {
		const source = '(?<=^(?:\x00\\d+c\x7f)*)={1,6}|\\[\\[|{{2,}|-{(?!{)',
			/** @type {BracketExecArray[]} */ stack = [],
			closes = {'=': '\n', '{': '}{2,}|\\|', '-': '}-', '[': ']]'};
		let /** @type {string} */ text = this.firstChild,
			regex = new RegExp(source, 'gm'),
			/** @type {BracketExecArray} */ mt = regex.exec(text),
			moreBraces = text.includes('}}'),
			lastIndex;
		while (mt || lastIndex <= text.length && stack.at(-1)?.[0]?.[0] === '=') {
			const {0: syntax, index: curIndex} = mt ?? {0: '\n', index: text.length},
				/** @type {BracketExecArray} */ top = stack.pop() ?? {},
				{0: open, index, parts} = top,
				innerEqual = syntax === '=' && top.findEqual;
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
						if (e instanceof Error && e.message.startsWith('非法的模板名称：')) {
							lastIndex = index + open.length;
							skip = true;
						} else {
							throw e;
						}
					}
				}
				if (!skip) {
					/* 标记{{!}}结束 */
					text = `${text.slice(0, index + rest)}\x00${length}${ch}\x7f${text.slice(lastIndex)}`;
					lastIndex = index + rest + 3 + String(length).length;
					if (rest > 1) {
						stack.push({0: open.slice(0, rest), index, pos: index + rest, parts: [[]]});
					} else if (rest === 1 && text[index - 1] === '-') {
						stack.push({0: '-{', index: index - 1, pos: index + 1, parts: [[]]});
					}
				}
			} else { // 情形5：开启
				lastIndex = curIndex + syntax.length;
				if ('0' in top) {
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
		this.replaceChildren(text);
	}

	#parseHtml() {
		const regex = /^(\/?)([a-z][^\s/>]*)([^>]*?)(\/?>)([^<]*)$/i,
			elements = this.#config.html.flat(),
			/** @type {{firstChild: string}} */ {firstChild} = this,
			bits = firstChild.split('<');
		let text = bits.shift();
		for (const x of bits) {
			const mt = x.match(regex),
				t = mt?.[2],
				name = t?.toLowerCase();
			if (!mt || !elements.includes(name)) {
				text += `<${x}`;
				continue;
			}
			const [, slash,, params, brace, rest] = mt,
				AttributeToken = require('./attributeToken'),
				attr = new AttributeToken(params, 'html-attr', name, this.#accum),
				itemprop = attr.getAttr('itemprop');
			if (name === 'meta' && (itemprop === undefined || attr.getAttr('content') === undefined)
				|| name === 'link' && (itemprop === undefined && attr.getAttr('href') === undefined)
			) {
				text += `<${x}`;
				this.#accum.pop();
				continue;
			}
			text += `\x00${this.#accum.length}x\x7f${rest}`;
			const HtmlToken = require('./htmlToken');
			new HtmlToken(t, attr, slash === '/', brace === '/>', this.#config, this.#accum);
		}
		this.replaceChildren(text);
	}

	/** @param {string} str */
	buildFromStr(str) {
		if (!Parser.debugging && externalUse('buildFromStr')) {
			debugOnly(this.constructor, 'buildFromStr');
		}
		return str.split(/[\x00\x7f]/).map((s, i) => {
			if (i % 2 === 0) {
				return s;
			}
			return this.#accum[Number(s.slice(0, -1))];
		});
	}

	/** 将占位符替换为子Token */
	build() {
		if (!Parser.debugging && externalUse('build')) {
			debugOnly(this.constructor, 'build');
		}
		this.#stage = MAX_STAGE;
		const {childNodes: {length}, firstChild} = this;
		if (this.#accum.length === 0 || length !== 1 || typeof firstChild !== 'string' || !firstChild.includes('\x00')) {
			return this;
		}
		this.replaceChildren(...this.buildFromStr(firstChild));
		this.normalize();
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.build();
			}
		}
		return this;
	}

	/** 生成部分Token的`name`属性 */
	afterBuild() {
		if (!Parser.debugging && externalUse('afterBuild')) {
			debugOnly(this.constructor, 'afterBuild');
		} else if (this.type === 'root') {
			for (const token of this.#accum) {
				token.afterBuild();
			}
		}
		return this;
	}

	/** 解析、重构、生成部分Token的`name`属性 */
	parse(n = MAX_STAGE, include = false) {
		if (typeof n !== 'number') {
			typeError('Number');
		} else if (n < MAX_STAGE && externalUse('parse')) {
			Parser.warn('指定解析层级的方法仅供熟练用户使用！');
		}
		while (this.#stage < n) {
			this.parseOnce(this.#stage, include);
		}
		return this.build().afterBuild();
	}
}

Parser.classes.Token = __filename;
module.exports = Token;
