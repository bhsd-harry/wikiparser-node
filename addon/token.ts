import fs from 'fs';
import path from 'path';
import {classes, states} from '../util/constants';
import {Shadow} from '../util/debug';
import {removeComment, removeCommentLine, decodeHtml} from '../util/string';
import Parser from '../index';
import {Token} from '../src/index';
import {CommentToken} from '../src/nowiki/comment';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {HtmlToken} from '../src/tag/html';
import {AttributesToken} from '../src/attributes';
import {expandedMagicWords, expandMagicWord} from './magicWords';
import type {Config} from '../base';
import type {AstRange} from '../lib/range';
import type {MagicWord} from './magicWords';
import type {HeadingToken, ArgToken, TranscludeToken, ParameterToken} from '../internal';

const blockElems = 'table|h1|h2|h3|h4|h5|h6|pre|p|ul|ol|dl',
	antiBlockElems = 'td|th',
	solvedMagicWords = new Set([
		'if',
		'ifeq',
		'ifexist',
		'switch',
	]);
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/<(?:table|\/(?:td|th)|\/?(?:tr|caption|dt|dd|li))\b/iu;
const openRegex = new RegExp(
	String.raw`<(?:${blockElems}|\/(?:${antiBlockElems})|\/?(?:tr|caption|dt|dd|li))\b`,
	'iu',
);
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/<(?:\/(?:h1|h2)|td|th|\/?(?:center|blockquote|div|hr|figure))\b/iu;
const closeRegex = new RegExp(
	String.raw`<(?:\/(?:${blockElems})|${antiBlockElems}|\/?(?:center|blockquote|div|hr|figure))\b`,
	'iu',
);

/**
 * 隐式换行
 * @param str 字符串
 * @param prev 前一个字符
 */
const implicitNewLine = (str: string, prev: string): string =>
	prev + (prev !== '\n' && /^(?:\{\||[:;#*])/u.test(str) ? `\n${str}` : str);

/**
 * 比较两个字符串是否相等
 * @param a
 * @param b
 */
const cmp = (a: string, b: string): boolean => a === b || Boolean(a && b) && Number(a) === Number(b);

/**
 * 解析 if/ifexist/ifeq 解析器函数
 * @param accum
 * @param prev 解析器函数前的字符串
 * @param effective 生效的参数
 */
const parseIf = (accum: Token[], prev: string, effective?: ParameterToken): string => {
	if (effective) {
		// @ts-expect-error sparse array
		accum[accum.indexOf(effective.lastChild)] = undefined;
		return implicitNewLine(effective.value, prev);
	}
	return prev;
};

/**
 * 展开模板
 * @param wikitext
 * @param page 页面名称
 * @param config
 * @param include
 * @param context 模板调用环境
 * @param now 当前时间
 * @param accum
 * @param stack 模板调用栈
 */
const expand = (
	wikitext: string,
	page: string | undefined,
	config: Config,
	include: boolean,
	context?: TranscludeToken | false,
	now = Parser.now ?? new Date(),
	accum: Token[] = [],
	stack: string[] = [],
): Token => {
	const n = accum.length,
		token = new Token(wikitext, {...config, inExt: true}, accum);
	token.type = 'root';
	token.pageName = page;
	token.parseOnce(0, include);
	if (context !== false) {
		token.setText(removeCommentLine(token.firstChild!.toString(), true));
	}
	token.parseOnce();
	for (const plain of [...accum.slice(n), token]) {
		if (plain.length !== 1 || plain.firstChild!.type !== 'text') {
			continue;
		}
		const {data} = plain.firstChild!;
		if (!/\0\d+t\x7F/u.test(data)) {
			continue;
		}
		const expanded = data.replace(/([^\x7F]?)\0(\d+)t\x7F/gu, (m, prev: string, i: string) => {
			const target = accum[i as unknown as number] as ArgToken | TranscludeToken,
				{type, name, length, firstChild: f, childNodes} = target,
				isTemplate = type === 'template',
				args = childNodes.slice(1) as ParameterToken[];
			if (type === 'arg') {
				const arg = removeCommentLine(f.toString()).trim();
				if (/\0\d+t\x7F/u.test(arg)) {
					return m;
				} else if (!context || !context.hasArg(arg)) {
					const effective = target.childNodes[1] ?? target;
					// @ts-expect-error sparse array
					accum[accum.indexOf(length === 1 ? f : effective)] = undefined;
					return prev + effective.toString();
				}
				// @ts-expect-error sparse array
				accum[accum.indexOf(context.getArg(arg)!.lastChild)] = undefined;
				return prev + context.getValue(arg)!;
			} else if (isTemplate || name === 'int') {
				if (context === false) {
					return m;
				}
				const nameToken = isTemplate ? f : args[0]!,
					key = removeComment(nameToken.toString()),
					fallback = isTemplate ? m : `${prev}⧼${key}⧽`,
					{title, valid} = Parser.normalizeTitle(
						(isTemplate ? '' : 'MediaWiki:') + key,
						10,
						include,
						config,
						{halfParsed: true, temporary: true, page},
					);
				if (!valid) {
					// @ts-expect-error sparse array
					accum[accum.indexOf(target)] = undefined;
					// @ts-expect-error sparse array
					accum[accum.indexOf(f)] = undefined;
					return isTemplate ? prev + target.toString() : fallback;
				} else if (!Parser.templates.has(title)) {
					if (Parser.templateDir === undefined) {
						return fallback;
					} else if (!path.isAbsolute(Parser.templateDir)) {
						Parser.templateDir = path.join(__dirname, '..', '..', Parser.templateDir);
					}
					const file = fs.readdirSync(Parser.templateDir, {withFileTypes: true, recursive: true})
						.filter(dirent => dirent.isFile())
						.find(({name: fl, parentPath}) => {
							const t = path.relative(
								Parser.templateDir!,
								path.join(parentPath, fl.replace(/\.(?:wiki|txt)$/iu, '')),
							).replaceAll('꞉', ':');
							try {
								return decodeURIComponent(t) === title;
							} catch {
								return t === title;
							}
						});
					if (!file) {
						return fallback;
					}
					Parser.templates.set(
						title,
						fs.readFileSync(path.join(file.parentPath, file.name), 'utf8'),
					);
				} else if (stack.includes(title)) {
					return `${prev}<span class="error">Template loop detected: [[${title}]]</span>`;
				}
				let template = Parser.templates.get(title)!;
				if (!isTemplate) {
					for (let j = 1; j < args.length; j++) {
						template = template.replaceAll(`$${j}`, removeComment(args[j]!.toString()));
					}
				}
				return implicitNewLine(
					expand(template, title, config, true, target, now, accum, [...stack, title]).toString(),
					prev,
				);
			} else if (Parser.functionHooks.has(name)) {
				return context === false ? m : prev + Parser.functionHooks.get(name)!(target, context || undefined);
			} else if (expandedMagicWords.has(name)) {
				return context === false ? m : `${prev}${expandMagicWord(name as MagicWord, now, config, args)}`;
			} else if (!solvedMagicWords.has(name)) {
				return m;
			} else if (length < 3 || name === 'ifeq' && length === 3) {
				return prev;
			}
			const var1 = decodeHtml(args[0]!.value),
				var2 = decodeHtml(args[1]!.value),
				known = !/\0\d+t\x7F/u.test(var1);
			if (known && (name === 'if' || name === 'ifexist')) {
				let bool = Boolean(var1);
				if (name === 'ifexist') {
					const {valid, interwiki} = Parser.normalizeTitle(
						var1,
						0,
						include,
						config,
						{halfParsed: true, temporary: true, page: ''},
					);
					bool = valid && !interwiki;
				}
				return parseIf(accum, prev, args[bool ? 1 : 2]);
			} else if (known && name === 'ifeq' && !/\0\d+t\x7F/u.test(var2)) {
				return parseIf(accum, prev, args[cmp(var1, var2) ? 2 : 3]);
			} else if (known && name === 'switch') {
				let defaultVal = '',
					j = 2,

					/**
					 * - `1` 表示默认值
					 * - `2` 表示匹配值
					 */
					found = 0,
					transclusion = false, // eslint-disable-line no-useless-assignment
					defaultParam: Token | undefined;
				for (; j < length; j++) {
					const {anon, value, lastChild, name: option} = args[j - 1]!;
					transclusion = /\0\d+t\x7F/u.test(anon ? value : option);
					if (anon) {
						if (j === length - 1) { // 位于最后的匿名参数是默认值
							defaultParam = lastChild;
							defaultVal = value;
						} else if (transclusion) { // 不支持复杂参数
							break;
						} else if (cmp(var1, decodeHtml(value))) { // 下一个命名参数视为匹配值
							found = 2;
						} else if (value === '#default' && found !== 2) { // 下一个命名参数视为默认值
							found = 1;
						}
					} else if (transclusion) { // 不支持复杂参数
						break;
					} else if (found === 2 || cmp(var1, decodeHtml(option))) { // 第一个匹配值
						// @ts-expect-error sparse array
						accum[accum.indexOf(lastChild)] = undefined;
						return implicitNewLine(value, prev);
					} else if (found === 1 || option.toLowerCase() === '#default') { // 更新默认值
						defaultParam = lastChild;
						defaultVal = value;
						found = 0;
					}
				}
				if (j === length) { // 不含复杂参数
					if (defaultParam) {
						// @ts-expect-error sparse array
						accum[accum.indexOf(defaultParam)] = undefined;
					}
					return implicitNewLine(defaultVal, prev);
				}
			}
			return m;
		});
		plain.setText(expanded);
		if (plain.type === 'parameter-key') {
			(plain.parentNode as ParameterToken).trimName(removeCommentLine(expanded));
		}
	}
	return token;
};

/**
 * 展开指定节点的模板
 * @param token 目标节点
 * @param context 模板调用环境
 */
const expandToken = (token: Token, context?: false): Token => expand(
	token.toString(),
	token.pageName,
	token.getAttribute('config'),
	token.getAttribute('include'),
	context,
);

Token.prototype.expand = /** @implements */ function(): Token {
	return Shadow.run(() => expandToken(this).parse());
};

Token.prototype.solveConst = /** @implements */ function(): Token {
	return Shadow.run(() => expandToken(this, false).parse());
};

Token.prototype.toHtml = /** @implements */ function(): string {
	const {viewOnly} = Parser;
	let html: string;
	if (this.type === 'root') {
		Parser.viewOnly = true;
		const expanded = Shadow.run(() => expandToken(this).parse(undefined, false, true));
		Parser.viewOnly = false;
		states.set(expanded, {headings: new Set()});
		const lines = expanded.toHtmlInternal().split('\n');
		let output = '',
			inBlockElem = false,
			pendingPTag: string | false = false,
			inBlockquote = false,
			lastParagraph = '';
		const /** @ignore */ closeParagraph = (): string => {
			if (lastParagraph) {
				const result = `</${lastParagraph}>\n`;
				lastParagraph = '';
				return result;
			}
			return '';
		};
		for (let line of lines) {
			const openMatch = openRegex.test(line),
				closeMatch = closeRegex.test(line);
			if (openMatch || closeMatch) {
				const blockquote = /<(\/?)blockquote[\s>](?!.*<\/?blockquote[\s>])/iu.exec(line)?.[1];
				inBlockquote = blockquote === undefined ? inBlockquote : !blockquote;
				pendingPTag = false;
				output += closeParagraph();
				inBlockElem = !closeMatch;
			} else if (!inBlockElem) {
				if (line.startsWith(' ') && (lastParagraph === 'pre' || line.trim()) && !inBlockquote) {
					if (lastParagraph !== 'pre') {
						pendingPTag = false;
						output += `${closeParagraph()}<pre>`;
						lastParagraph = 'pre';
					}
					line = line.slice(1);
				} else if (/^(?:<link\b[^>]*>\s*)+$/iu.test(line)) {
					if (pendingPTag) {
						output += closeParagraph();
						pendingPTag = false;
					}
				} else if (!line.trim()) {
					if (pendingPTag) {
						output += `${pendingPTag}<br>`;
						pendingPTag = false;
						lastParagraph = 'p';
					} else if (lastParagraph === 'p') {
						pendingPTag = '</p><p>';
					} else {
						output += closeParagraph();
						pendingPTag = '<p>';
					}
				} else if (pendingPTag) {
					output += pendingPTag;
					pendingPTag = false;
					lastParagraph = 'p';
				} else if (lastParagraph !== 'p') {
					output += `${closeParagraph()}<p>`;
					lastParagraph = 'p';
				}
			}
			if (!pendingPTag) {
				output += `${line}\n`;
			}
		}
		output += closeParagraph();
		states.delete(expanded);
		html = output.trimEnd();
	} else {
		Parser.viewOnly = false;
		html = this.cloneNode().toHtmlInternal();
	}
	Parser.viewOnly = viewOnly;
	return html;
};

Token.prototype.createComment = /** @implements */ function(data = ''): CommentToken {
	// @ts-expect-error abstract class
	return Shadow.run((): CommentToken => new CommentToken(
		data.replaceAll('-->', '--&gt;'),
		true,
		this.getAttribute('config'),
	));
};

Token.prototype.createElement = /** @implements */ function(
	tagName,
	{selfClosing, closing} = {},
): IncludeToken | ExtToken | HtmlToken {
	const config = this.getAttribute('config'),
		include = this.getAttribute('include');
	if (tagName === (include ? 'noinclude' : 'includeonly')) {
		return Shadow.run(
			// @ts-expect-error abstract class
			(): IncludeToken => new IncludeToken(tagName, '', undefined, selfClosing ? undefined : tagName, config),
		);
	} else if (config.ext.includes(tagName)) {
		return Shadow.run(
			// @ts-expect-error abstract class
			(): ExtToken => new ExtToken(tagName, '', undefined, selfClosing ? undefined : '', config, include),
		);
	} else if (config.html.some(tags => tags.includes(tagName))) {
		return Shadow.run((): HtmlToken => {
			// @ts-expect-error abstract class
			const attr: AttributesToken = new AttributesToken(undefined, 'html-attrs', tagName, config);
			attr.afterBuild();
			// @ts-expect-error abstract class
			return new HtmlToken(tagName, attr, Boolean(closing), Boolean(selfClosing), config);
		});
	}
	/* istanbul ignore next */
	throw new RangeError(`Invalid tag name: ${tagName}`);
};

Token.prototype.sections = /** @implements */ function(): AstRange[] | undefined {
	if (this.type !== 'root') {
		return undefined;
	}
	const {childNodes, length} = this,
		headings: [number, number][] = [...childNodes.entries()]
			.filter((entry): entry is [number, HeadingToken] => entry[1].is<HeadingToken>('heading'))
			.map(([i, {level}]) => [i, level]),
		lastHeading = [-1, -1, -1, -1, -1, -1],
		sections = headings.map(([i]) => {
			const range = this.createRange();
			range.setStart(this, i);
			return range;
		});
	for (let i = 0; i < headings.length; i++) {
		const [index, level] = headings[i]!;
		for (let j = level; j < 6; j++) {
			const last = lastHeading[j]!;
			if (last >= 0) {
				sections[last]!.setEnd(this, index);
			}
			lastHeading[j] = j === level ? i : -1;
		}
	}
	for (const last of lastHeading) {
		if (last >= 0) {
			sections[last]!.setEnd(this, length);
		}
	}
	const range = this.createRange();
	range.setStart(this, 0);
	range.setEnd(this, headings[0]?.[0] ?? length);
	sections.unshift(range);
	return sections;
};

Token.prototype.findEnclosingHtml = /** @implements */ function(tag): AstRange | undefined {
	tag &&= tag.toLowerCase();
	const {html} = this.getAttribute('config'),
		normalTags = new Set(html[0]),
		voidTags = new Set(html[2]);
	/* istanbul ignore next */
	if (voidTags.has(tag!)) {
		throw new RangeError(`Void tag: ${tag}`);
	} else if (tag && !normalTags.has(tag) && !html[1].includes(tag)) {
		throw new RangeError(`Invalid tag name: ${tag}`);
	}
	const {parentNode} = this;
	if (!parentNode) {
		return undefined;
	}
	const {childNodes} = parentNode,
		index = childNodes.indexOf(this);
	let i = index - 1,
		j;
	for (; i >= 0; i--) {
		const open = childNodes[i]!,
			{name, closing, selfClosing} = open as HtmlToken;
		if (
			open.is<HtmlToken>('html') && !closing
			&& (tag ? name === tag : !voidTags.has(name))
			&& (normalTags.has(name) || !selfClosing)
		) {
			const close = open.findMatchingTag();
			if (close) {
				j = childNodes.indexOf(close);
				if (j > index) {
					break;
				}
			}
		}
	}
	if (i === -1) {
		return parentNode.findEnclosingHtml(tag);
	}
	const range = this.createRange();
	range.setStart(parentNode, i);
	range.setEnd(parentNode, j! + 1); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
	return range;
};

classes['ExtendedToken'] = __filename;
