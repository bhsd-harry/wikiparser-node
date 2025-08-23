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
import {HtmlToken} from '../src/html';
import {AttributesToken} from '../src/attributes';
import type {Config} from '../base';
import type {AstRange} from '../lib/range';
import type {HeadingToken, ArgToken, TranscludeToken, SyntaxToken, ParameterToken} from '../internal';

const blockElems = 'table|h1|h2|h3|h4|h5|h6|pre|p|ul|ol|dl',
	antiBlockElems = 'td|th',
	solvedMagicWords = new Set([
		'if',
		'ifeq',
		'ifexist',
		'switch',
	]),
	expandedMagicWords = new Set([
		'currentmonth',
		'currentmonth1',
		'currentmonthname',
		'currentmonthnamegen',
		'currentmonthabbrev',
		'currentday',
		'currentday2',
		'currentdayname',
		'currentyear',
		'currenttime',
		'currenthour',
		'currentweek',
		'currentdow',
		'currenttimestamp',
		'localmonth',
		'localmonth1',
		'localmonthname',
		'localmonthnamegen',
		'localmonthabbrev',
		'localday',
		'localday2',
		'localdayname',
		'localyear',
		'localtime',
		'localhour',
		'localweek',
		'localdow',
		'localtimestamp',
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
 * @param config
 * @param include
 * @param context 模板调用环境
 * @param now 当前时间
 * @param accum
 * @param stack 模板调用栈
 */
const expand = (
	wikitext: string,
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
		const expanded = data.replace(/([^\x7F]?)\0(\d+)t\x7F/gu, (m, prev: string, i: number) => {
			const target = accum[i] as ArgToken | TranscludeToken,
				{type, name, length, firstChild: f} = target;
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
			} else if (type === 'template') {
				if (context === false) {
					return m;
				}
				const c = target.getAttribute('config'),
					{title, valid} = Parser.normalizeTitle(
						removeComment(f.toString()),
						10,
						include,
						c,
						{halfParsed: true, temporary: true},
					);
				if (!valid) {
					// @ts-expect-error sparse array
					accum[accum.indexOf(target)] = undefined;
					// @ts-expect-error sparse array
					accum[accum.indexOf(f)] = undefined;
					return prev + target.toString();
				} else if (!Parser.templates.has(title)) {
					if (Parser.templateDir === undefined) {
						return m;
					} else if (!path.isAbsolute(Parser.templateDir)) {
						Parser.templateDir = path.join(__dirname, '..', '..', Parser.templateDir);
					}
					const file = fs.readdirSync(Parser.templateDir, {withFileTypes: true})
						.filter(dirent => dirent.isFile())
						.find(({name: fl}) => {
							const t = fl.replace(/\.(?:wiki|txt)$/iu, '')
								.replaceAll('꞉', ':');
							try {
								return decodeURIComponent(t) === title;
							} catch {
								return t === title;
							}
						});
					if (!file) {
						return m;
					}
					Parser.templates.set(
						title,
						fs.readFileSync(path.join(file.parentPath, file.name), 'utf8'),
					);
				} else if (stack.includes(title)) {
					return `${prev}<span class="error">Template loop detected: [[${title}]]</span>`;
				}
				return implicitNewLine(
					expand(
						Parser.templates.get(title)!,
						config,
						true,
						target,
						now,
						accum,
						[...stack, title],
					).toString(),
					prev,
				);
			} else if (Parser.functionHooks.has(name)) {
				return context === false ? m : Parser.functionHooks.get(name)!(target, context || undefined);
			} else if (expandedMagicWords.has(name)) {
				if (context === false) {
					return m;
				}
				switch (name) {
					case 'currentyear':
						return `${prev}${now.getUTCFullYear()}`;
					case 'currentmonth':
						return prev + String(now.getUTCMonth() + 1).padStart(2, '0');
					case 'currentmonth1':
						return `${prev}${now.getUTCMonth() + 1}`;
					case 'currentmonthname':
					case 'currentmonthnamegen':
						return prev + now.toLocaleString('default', {month: 'long', timeZone: 'UTC'});
					case 'currentmonthabbrev':
						return prev + now.toLocaleString('default', {month: 'short', timeZone: 'UTC'});
					case 'currentday':
						return `${prev}${now.getUTCDate()}`;
					case 'currentday2':
						return prev + String(now.getUTCDate()).padStart(2, '0');
					case 'currentdow':
						return `${prev}${now.getUTCDay()}`;
					case 'currentdayname':
						return prev + now.toLocaleString('default', {weekday: 'long', timeZone: 'UTC'});
					case 'currenttime':
						return `${prev}${
							String(now.getUTCHours()).padStart(2, '0')
						}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
					case 'currenthour':
						return prev + String(now.getUTCHours()).padStart(2, '0');
					case 'currentweek': {
						const firstDay = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
						return `${prev}${Math.ceil((now.getTime() - firstDay.getTime()) / 1e3 / 60 / 60 / 24 / 7)}`;
					}
					case 'currenttimestamp':
						return prev + now.toISOString().slice(0, 19)
							.replace(/[-:T]/gu, '');
					case 'localyear':
						return `${prev}${now.getFullYear()}`;
					case 'localmonth':
						return prev + String(now.getMonth() + 1).padStart(2, '0');
					case 'localmonth1':
						return `${prev}${now.getMonth() + 1}`;
					case 'localmonthname':
					case 'localmonthnamegen':
						return prev + now.toLocaleString('default', {month: 'long'});
					case 'localmonthabbrev':
						return prev + now.toLocaleString('default', {month: 'short'});
					case 'localday':
						return `${prev}${now.getDate()}`;
					case 'localday2':
						return prev + String(now.getDate()).padStart(2, '0');
					case 'localdow':
						return `${prev}${now.getDay()}`;
					case 'localdayname':
						return prev + now.toLocaleString('default', {weekday: 'long'});
					case 'localtime':
						return `${prev}${
							String(now.getHours()).padStart(2, '0')
						}:${String(now.getMinutes()).padStart(2, '0')}`;
					case 'localhour':
						return prev + String(now.getHours()).padStart(2, '0');
					case 'localweek': {
						const firstDay = new Date(now.getFullYear(), 0, 1);
						return `${prev}${Math.ceil((now.getTime() - firstDay.getTime()) / 1e3 / 60 / 60 / 24 / 7)}`;
					}
					case 'localtimestamp':
						return prev
							+ String(now.getFullYear())
							+ String(now.getMonth() + 1).padStart(2, '0')
							+ String(now.getDate()).padStart(2, '0')
							+ String(now.getHours()).padStart(2, '0')
							+ String(now.getMinutes()).padStart(2, '0')
							+ String(now.getSeconds()).padStart(2, '0');
					// no default
				}
			} else if (!solvedMagicWords.has(name)) {
				return m;
			} else if (length < 3 || name === 'ifeq' && length === 3) {
				return prev;
			}
			const c = target.childNodes as [SyntaxToken, ParameterToken, ParameterToken, ...ParameterToken[]],
				var1 = decodeHtml(c[1].value),
				var2 = decodeHtml(c[2].value),
				known = !/\0\d+t\x7F/u.test(var1);
			if (known && (name === 'if' || name === 'ifexist')) {
				let bool = Boolean(var1);
				if (name === 'ifexist') {
					const {valid, interwiki} = Parser
						.normalizeTitle(var1, 0, include, config, {halfParsed: true, temporary: true});
					bool = valid && !interwiki;
				}
				return parseIf(accum, prev, c[bool ? 2 : 3]);
			} else if (known && name === 'ifeq' && !/\0\d+t\x7F/u.test(var2)) {
				return parseIf(accum, prev, c[cmp(var1, var2) ? 3 : 4]);
			} else if (known && name === 'switch') {
				let defaultVal = '',
					j = 2,

					/**
					 * - `1` 表示默认值
					 * - `2` 表示匹配值
					 */
					found = 0,
					transclusion = false,
					defaultParam: Token | undefined;
				for (; j < length; j++) {
					const {anon, value, lastChild, name: option} = c[j] as ParameterToken;
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

Token.prototype.expand = /** @implements */ function(): Token {
	return Shadow.run(
		() => expand(this.toString(), this.getAttribute('config'), this.getAttribute('include')).parse(),
	);
};

Token.prototype.solveConst = /** @implements */ function(): Token {
	return Shadow.run(
		() => expand(
			this.toString(),
			this.getAttribute('config'),
			this.getAttribute('include'),
			false,
		).parse(),
	);
};

Token.prototype.toHtml = /** @implements */ function(): string {
	const {viewOnly} = Parser;
	let html: string;
	if (this.type === 'root') {
		Parser.viewOnly = true;
		const expanded = Shadow.run(
			() => expand(this.toString(), this.getAttribute('config'), this.getAttribute('include'))
				.parse(undefined, false, true),
		);
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
	const config = this.getAttribute('config');
	return Shadow.run(
		// @ts-expect-error abstract class
		(): CommentToken => new CommentToken(data.replaceAll('-->', '--&gt;'), true, config),
	);
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
