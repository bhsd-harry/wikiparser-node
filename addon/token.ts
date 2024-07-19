import * as fs from 'fs';
import * as path from 'path';
import {classes, states} from '../util/constants';
import {Shadow} from '../util/debug';
import {removeComment, removeCommentLine, trimPHP} from '../util/string';
import Parser from '../index';
import {Token} from '../src/index';
import {CommentToken} from '../src/nowiki/comment';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {HtmlToken} from '../src/html';
import {AttributesToken} from '../src/attributes';
import type {Config} from '../base';
import type {AstRange} from '../lib/range';
import type {AstNodes, CaretPosition} from '../lib/node';
import type {TagToken} from '../src/index';
import type {HeadingToken, ArgToken, TranscludeToken, SyntaxToken, ParameterToken, RedirectToken} from '../internal';

Token.prototype.createComment = /** @implements */ function(data = ''): CommentToken {
	const config = this.getAttribute('config');
	// @ts-expect-error abstract class
	return Shadow.run((): CommentToken => new CommentToken(data.replaceAll('-->', '--&gt;'), true, config));
};

Token.prototype.createElement = /** @implements */ function(tagName, {selfClosing, closing} = {}): TagToken {
	const config = this.getAttribute('config'),
		include = this.getAttribute('include');
	if (tagName === (include ? 'noinclude' : 'includeonly')) {
		return Shadow.run(
			// @ts-expect-error abstract class
			() => new IncludeToken(tagName, '', undefined, selfClosing ? undefined : tagName, config),
		);
	} else if (config.ext.includes(tagName)) {
		// @ts-expect-error abstract class
		return Shadow.run(() => new ExtToken(tagName, '', undefined, selfClosing ? undefined : '', config));
	} else if (config.html.some(tags => tags.includes(tagName))) {
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const attr: AttributesToken = new AttributesToken(undefined, 'html-attrs', tagName, config);
			attr.afterBuild();
			// @ts-expect-error abstract class
			return new HtmlToken(tagName, attr, Boolean(closing), Boolean(selfClosing), config);
		});
	}
	throw new RangeError(`Invalid tag name: ${tagName}`);
};

Token.prototype.caretPositionFromIndex = /** @implements */ function(index): CaretPosition | undefined {
	if (index === undefined) {
		return undefined;
	}
	const {length} = this.toString();
	if (index >= length || index < -length) {
		return undefined;
	}
	index += index < 0 ? length : 0;
	let self: AstNodes = this,
		acc = 0,
		start = 0;
	while (self.type !== 'text') {
		const {childNodes}: Token = self;
		acc += self.getAttribute('padding');
		for (let i = 0; acc <= index && i < childNodes.length; i++) {
			const cur: AstNodes = childNodes[i]!,
				l = cur.toString().length;
			acc += l;
			if (acc > index) {
				self = cur;
				acc -= l;
				start = acc;
				break;
			}
			acc += self.getGaps(i);
		}
		if (self.childNodes === childNodes) {
			return {offsetNode: self, offset: index - start};
		}
	}
	return {offsetNode: self, offset: index - start};
};

Token.prototype.sections = /** @implements */ function(): AstRange[] | undefined {
	if (this.type !== 'root') {
		return undefined;
	}
	const {childNodes, length} = this,
		headings: [number, number][] = [...childNodes.entries()]
			.filter((entry): entry is [number, HeadingToken] => entry[1].type === 'heading')
			.map(([i, {level}]) => [i, level]),
		lastHeading = [-1, -1, -1, -1, -1, -1],
		sections = headings.map(([i]) => {
			const range = this.createRange();
			range.setStart(this, i);
			return range;
		});
	for (const [i, [index, level]] of headings.entries()) {
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
	tag = tag?.toLowerCase();
	const {html} = this.getAttribute('config'),
		normalTags = new Set(html[0]),
		voidTags = new Set(html[2]);
	if (html[2].includes(tag!)) {
		throw new RangeError(`Void tag: ${tag}`);
	} else if (tag !== undefined && !html.slice(0, 2).some(tags => tags.includes(tag))) {
		throw new RangeError(`Invalid tag name: ${tag}`);
	}
	const {parentNode} = this;
	if (!parentNode) {
		return undefined;
	}

	/**
	 * 检查是否为指定的 HTML 标签
	 * @param node 节点
	 * @param name 标签名
	 * @param closing 是否为闭合标签
	 */
	const checkHtml = (node: AstNodes, name: string | undefined, closing: boolean): boolean =>
		node.is<HtmlToken>('html')
		&& (!name && !voidTags.has(node.name) || node.name === name)
		&& (normalTags.has(node.name) || !node.selfClosing)
		&& node.closing === closing;
	const {childNodes, length} = parentNode,
		index = childNodes.indexOf(this);
	let i = index - 1,
		j = length;
	for (; i >= 0; i--) {
		const open = childNodes[i]!;
		if (checkHtml(open, tag, false)) {
			for (j = index + 1; j < length; j++) {
				const close = childNodes[j]!;
				if (checkHtml(close, open.name, true)) {
					break;
				}
			}
			if (j < length) {
				break;
			}
		}
	}
	if (i === -1) {
		return parentNode.findEnclosingHtml(tag);
	}
	const range = this.createRange();
	range.setStart(parentNode, i);
	range.setEnd(parentNode, j + 1);
	return range;
};

/**
 * 隐式换行
 * @param str 字符串
 * @param prev 前一个字符
 */
const implicitNewLine = (str: string, prev: string): string =>
	prev + (prev !== '\n' && /^(?:\{\||[:;#*])/u.test(str) ? `\n${str}` : str);

/**
 * 展开模板
 * @param wikitext
 * @param config
 * @param include
 * @param context 模板调用环境
 * @param accum
 * @throws `Error` 嵌入了重定向页面
 */
const expand = (
	wikitext: string,
	config: Config,
	include: boolean,
	context?: TranscludeToken | false,
	accum: Token[] = [],
): Token => {
	const magicWords = new Set(['if', 'ifeq', 'switch']),
		n = accum.length,
		token = new Token(wikitext, config, accum);
	token.type = 'root';
	token.parseOnce(0, include);
	if (context !== false) {
		const str = token.firstChild!.toString(),
			mt = /^\0(\d+)n\x7F/u.exec(str);
		let visible = removeCommentLine(str, true);
		if (mt) {
			const redirect = accum[Number(mt[1])];
			if (redirect?.type === 'redirect') {
				if (context) {
					Parser.error('Transcluded redirect ->', (redirect as RedirectToken).lastChild.toString());
					throw new Error('A redirect is transcluded!');
				}
				visible = mt[0] + visible;
			}
		}
		token.setText(visible);
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
				if (context === undefined || /\0\d+t\x7F/u.test(arg)) {
					return m;
				} else if (context === false || !context.hasArg(arg)) {
					const effective = target.childNodes[1] ?? target;
					// @ts-expect-error sparse array
					accum[accum.indexOf(effective)] = undefined;
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
					{title} = Parser.normalizeTitle(removeComment(f.toString()), 10, include, c, true);
				if (!Parser.templates.has(title)) {
					if (Parser.templateDir === undefined) {
						return m;
					} else if (!path.isAbsolute(Parser.templateDir)) {
						Parser.templateDir = path.join(__dirname, '..', '..', Parser.templateDir);
					}
					const file = ['.wiki', '.txt', ''].map(ext => path.join(Parser.templateDir!, title + ext))
						.find(fs.existsSync);
					if (!file) {
						return m;
					}
					Parser.templates.set(title, fs.readFileSync(file, 'utf8'));
				}
				return implicitNewLine(
					expand(Parser.templates.get(title)!, config, true, target, accum).toString(),
					prev,
				);
			} else if (!magicWords.has(name)) {
				return m;
			} else if (length < 3 || name === 'ifeq' && length === 3) {
				return prev;
			}
			const c = target.childNodes as [SyntaxToken, ParameterToken, ParameterToken, ...ParameterToken[]],
				var1 = c[1].value,
				var2 = c[2].value,
				known = !/\0\d+t\x7F/u.test(var1);
			if (name === 'if' && known) {
				const effective = c[var1 ? 2 : 3];
				if (effective) {
					// @ts-expect-error sparse array
					accum[accum.indexOf(effective.lastChild)] = undefined;
					return implicitNewLine(effective.value, prev);
				}
				return prev;
			} else if (name === 'ifeq' && known && !/\0\d+t\x7F/u.test(var2)) {
				const effective = c[var1 === var2 ? 3 : 4];
				if (effective) {
					// @ts-expect-error sparse array
					accum[accum.indexOf(effective.lastChild)] = undefined;
					return implicitNewLine(effective.value, prev);
				}
				return prev;
			} else if (name === 'switch' && known) {
				let defaultVal = '',
					found = false,
					transclusion = false,
					defaultParam: Token | undefined;
				for (let j = 2; j < length; j++) {
					const {anon, value, firstChild, lastChild} = c[j] as ParameterToken,
						option = trimPHP(removeCommentLine(firstChild.toString()));
					transclusion = /\0\d+t\x7F/u.test(anon ? value : option);
					if (anon) {
						if (j === length - 1) {
							// @ts-expect-error sparse array
							accum[accum.indexOf(lastChild)] = undefined;
							return implicitNewLine(value, prev);
						} else if (transclusion) {
							break;
						} else {
							found ||= var1 === value;
						}
					} else if (transclusion) {
						break;
					} else if (found || option === var1) {
						// @ts-expect-error sparse array
						accum[accum.indexOf(lastChild)] = undefined;
						return implicitNewLine(value, prev);
					} else if (option.toLowerCase() === '#default') {
						defaultVal = value;
						defaultParam = lastChild;
					}
					if (j === length - 1) {
						if (defaultParam) {
							// @ts-expect-error sparse array
							accum[accum.indexOf(defaultParam)] = undefined;
						}
						return implicitNewLine(defaultVal, prev);
					}
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
	if (this.type !== 'root') {
		throw new Error('Only root token can be expanded!');
	}
	return Shadow.run(
		() => expand(this.toString(), this.getAttribute('config'), this.getAttribute('include')).parse(),
	);
};

Token.prototype.solveConst = /** @implements */ function(): Token {
	if (this.type !== 'root') {
		throw new Error('Only root token can be expanded!');
	}
	return Shadow.run(
		() => expand(this.toString(), this.getAttribute('config'), this.getAttribute('include'), false).parse(),
	);
};

Token.prototype.toHtml = /** @implements */ function(): string {
	if (this.type !== 'root') {
		return this.cloneNode().toHtmlInternal();
	}
	const expanded = this.expand();
	states.set(expanded, {headings: new Set()});
	const lines = expanded.toHtmlInternal().split('\n'),
		blockElems = 'table|h1|h2|h3|h4|h5|h6|pre|p|ul|ol|dl',
		antiBlockElems = 'td|th',
		openRegex = new RegExp(
			String.raw`<(?:${blockElems}|\/(?:${antiBlockElems})|\/?(?:tr|caption|dt|dd|li))\b`,
			'iu',
		),
		closeRegex = new RegExp(
			String.raw`<(?:\/(?:${blockElems})|${antiBlockElems}|\/?(?:center|blockquote|div|hr|figure))\b`,
			'iu',
		);
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
			pendingPTag = false;
			output += closeParagraph();
			inBlockquote = /<(\/?)blockquote[\s>](?!.*<\/?blockquote[\s>])/iu.exec(line)?.[1] === '';
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
	return output.trimEnd();
};

classes['ExtendedToken'] = __filename;
