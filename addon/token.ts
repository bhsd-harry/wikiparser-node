/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import * as fs from 'fs';
import * as path from 'path';
import {classes} from '../util/constants';
import {Shadow, isToken} from '../util/debug';
import Parser from '../index';
import {Token} from '../src/index';
import {CommentToken} from '../src/nowiki/comment';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {HtmlToken} from '../src/html';
import {AttributesToken} from '../src/attributes';
import type {AstRange} from '../lib/range';
import type {AstNodes, CaretPosition} from '../lib/node';
import type {TagToken} from '../src/index';
import type {HeadingToken, ArgToken, TranscludeToken, SyntaxToken, ParameterToken} from '../internal';

Token.prototype.createComment =
	/** @implements */
	function(data = ''): CommentToken {
		const config = this.getAttribute('config');
		// @ts-expect-error abstract class
		return Shadow.run((): CommentToken => new CommentToken(data.replace(/-->/gu, '--&gt;'), true, config));
	};

Token.prototype.createElement =
	/** @implements */
	function(tagName, {selfClosing, closing} = {}): TagToken {
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

Token.prototype.caretPositionFromIndex =
	/** @implements */
	function(index): CaretPosition | undefined {
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

Token.prototype.sections =
	/** @implements */
	function(): AstRange[] | undefined {
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

Token.prototype.findEnclosingHtml =
	/** @implements */
	function(tag): AstRange | undefined {
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
		const isHtml = isToken<HtmlToken>('html'),

			/**
			 * 检查是否为指定的 HTML 标签
			 * @param node 节点
			 * @param name 标签名
			 * @param closing 是否为闭合标签
			 */
			checkHtml = (node: AstNodes, name: string | undefined, closing: boolean): boolean =>
				isHtml(node)
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

Token.prototype.redoQuotes =
	/** @implements */
	function(): void {
		const acceptable = this.getAcceptable();
		if (acceptable && !('QuoteToken' in acceptable)) {
			return;
		}
		const accum: Token[] = [];
		for (const child of this.childNodes) {
			if (child.type !== 'quote' && child.type !== 'text') {
				child.replaceWith(`\0${accum.length}e\x7F`);
				accum.push(child);
			}
		}
		const token = Shadow.run(() => {
			const node = new Token(this.toString(), this.getAttribute('config'), accum);
			node.setAttribute('stage', 6);
			return node.parse(7);
		});
		this.replaceChildren(...token.childNodes);
	};

Token.prototype.expand =
	/** @implements */
	function(context, recursive = true): void {
		const targets = this.querySelectorAll<ArgToken | TranscludeToken>(
				`magic-word, arg${recursive ? ', template' : ''}`,
			),
			magicWords = new Set(['if', 'ifeq', 'switch']),
			types = 'magic-word, template';
		for (let i = targets.length - 1; i >= 0; i--) {
			const target = targets[i]!,
				{type, name, childNodes: c, length} = target,
				[, var1, var2 = ''] = c as [SyntaxToken, ...ParameterToken[]];
			if (type === 'arg' || type === 'magic-word' && magicWords.has(name)) {
				let replace: string | readonly AstNodes[] = '';
				if (type === 'arg') {
					replace = (context?.getArg(name)?.lastChild.cloneNode() ?? var1)?.childNodes ?? target.toString();
				} else if (name === 'if' && !var1?.getElementByTypes(types)) {
					replace = c[String(var1 ?? '').trim() ? 2 : 3]?.lastChild!.childNodes ?? '';
				} else if (name === 'ifeq' && !c.slice(1, 3).some(child => child.getElementByTypes(types))) {
					replace = c[String(var1 ?? '').trim() === String(var2).trim() ? 3 : 4]?.lastChild!.childNodes ?? '';
				} else if (name === 'switch' && !var1?.getElementByTypes(types)) {
					const key = String(var1 ?? '').trim();
					let defaultVal: readonly AstNodes[] = [],
						found = false,
						transclusion = false;
					for (let j = 2; j < length; j++) {
						const {anon, name: option, value, firstChild, lastChild: {childNodes}} = c[j] as ParameterToken;
						transclusion = Boolean(firstChild.getElementByTypes<TranscludeToken>(types));
						if (anon) {
							if (j === length - 1) {
								defaultVal = childNodes;
							} else if (transclusion) {
								break;
							} else {
								found ||= key === value;
							}
						} else if (transclusion) {
							break;
						} else if (found || option === key) {
							replace = childNodes;
							break;
						} else if (option.toLowerCase() === '#default') {
							defaultVal = childNodes;
						}
						if (j === length - 1) {
							replace = defaultVal;
						}
					}
					if (transclusion) {
						continue;
					}
				} else {
					continue;
				}
				target.replaceWith(...typeof replace === 'string' ? [replace] : replace);
			} else if (type === 'template') {
				if (!Parser.templates.has(name)) {
					if (Parser.templateDir === undefined) {
						continue;
					} else if (!path.isAbsolute(Parser.templateDir)) {
						Parser.templateDir = path.join(__dirname, '..', '..', Parser.templateDir);
					}
					const file = ['.wiki', '.txt', ''].map(ext => path.join(Parser.templateDir!, name + ext))
						.find(fs.existsSync);
					if (!file) {
						continue;
					}
					const wikitext = fs.readFileSync(file, 'utf8');
					Parser.templates.set(name, Parser.parse(wikitext, true));
				}
				const template = Parser.templates.get(name)!.cloneNode();
				template.expand(target, recursive);
				target.replaceWith(...template.childNodes);
			}
		}
	};

classes['ExtendedTableToken'] = __filename;
