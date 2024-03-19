/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import {classes} from '../util/constants';
import {Shadow, isToken} from '../util/debug';
import {Token} from '../src/index';
import {CommentToken} from '../src/nowiki/comment';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {HtmlToken} from '../src/html';
import {AttributesToken} from '../src/attributes';
import type {AstRange} from '../lib/range';
import type {AstNodes, CaretPosition} from '../lib/node';
import type {TagToken} from '../src/index';
import type {AstText, HeadingToken, ArgToken, TranscludeToken, SyntaxToken, ParameterToken} from '../internal';

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
		} else if (config.html.flat().includes(tagName)) {
			return Shadow.run(() => {
				// @ts-expect-error abstract class
				const attr: AttributesToken = new AttributesToken(undefined, 'html-attrs', tagName, config);
				// @ts-expect-error abstract class
				return new HtmlToken(tagName, attr, Boolean(closing), Boolean(selfClosing), config);
			});
		}
		throw new RangeError(`非法的标签名：${tagName}`);
	};

Token.prototype.caretPositionFromIndex =
	/** @implements */
	function(index): CaretPosition | undefined {
		if (index === undefined) {
			return undefined;
		}
		const {length} = String(this);
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
					l = String(cur).length;
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
	function(): (AstText | Token)[][] | undefined {
		if (this.type !== 'root') {
			return undefined;
		}
		const {childNodes} = this,
			headings: [number, number][] = [...childNodes.entries()]
				.filter((entry): entry is [number, HeadingToken] => entry[1].type === 'heading')
				.map(([i, {level}]) => [i, level]),
			lastHeading = [-1, -1, -1, -1, -1, -1],
			sections: (AstText | Token)[][] = new Array(headings.length);
		for (let i = 0; i < headings.length; i++) {
			const [index, level] = headings[i]!;
			for (let j = level; j < 6; j++) {
				const last = lastHeading[j]!;
				if (last >= 0) {
					sections[last] = childNodes.slice(headings[last]![0], index);
				}
				lastHeading[j] = j === level ? i : -1;
			}
		}
		for (const last of lastHeading) {
			if (last >= 0) {
				sections[last] = childNodes.slice(headings[last]![0]);
			}
		}
		sections.unshift(childNodes.slice(0, headings[0]?.[0]));
		return sections;
	};

Token.prototype.findEnclosingHtml =
	/** @implements */
	function(tag): AstRange | undefined {
		tag = tag?.toLowerCase();
		if (tag !== undefined && !this.getAttribute('config').html.slice(0, 2).flat().includes(tag)) {
			throw new RangeError(`非法的标签或空标签：${tag}`);
		}
		const {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const isHtml = isToken<HtmlToken>('html'),
			{childNodes, length} = parentNode,
			index = childNodes.indexOf(this);
		let i: number;
		for (i = index - 1; i >= 0; i--) {
			const child = childNodes[i]!;
			if (isHtml(child) && (!tag || child.name === tag) && !child.selfClosing && !child.closing) {
				break;
			}
		}
		if (i === -1) {
			return parentNode.findEnclosingHtml(tag);
		}
		const opening = childNodes[i] as HtmlToken;
		for (i = index + 1; i < length; i++) {
			const child = childNodes[i]!;
			if (isHtml(child) && child.name === opening.name && !child.selfClosing && child.closing) {
				break;
			}
		}
		if (i === length) {
			return parentNode.findEnclosingHtml(tag);
		}
		const range = this.createRange();
		range.setStartBefore(opening);
		range.setEnd(parentNode, i + 1);
		return range;
	};

Token.prototype.redoQuotes =
	/** @implements */
	function(): void {
		const acceptable = this.getAttribute('acceptable');
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
			const node = new Token(String(this), this.getAttribute('config'), accum);
			node.type = 'plain';
			node.setAttribute('stage', 6);
			return node.parse(7);
		});
		this.replaceChildren(...token.childNodes);
	};

Token.prototype.solveConst =
	/** @implements */
	function(): void {
		const targets = this.querySelectorAll<ArgToken | TranscludeToken>('magic-word, arg'),
			magicWords = new Set(['if', 'ifeq', 'switch']);
		for (let i = targets.length - 1; i >= 0; i--) {
			const target = targets[i]!,
				{type, name, childNodes, length} = target,
				[, var1, var2 = ''] = childNodes as [SyntaxToken, ...ParameterToken[]];
			if (type === 'arg' || type === 'magic-word' && magicWords.has(name)) {
				let replace = '';
				if (type === 'arg') {
					replace = target.default === false ? String(target) : target.default;
				} else if (name === 'if' && !var1?.getElementByTypes('magic-word, template')) {
					replace = String(childNodes[String(var1 ?? '').trim() ? 2 : 3] ?? '').trim();
				} else if (
					name === 'ifeq'
					&& !childNodes.slice(1, 3).some(child => child.getElementByTypes('magic-word, template'))
				) {
					replace = String(childNodes[
						String(var1 ?? '').trim() === String(var2).trim() ? 3 : 4
					] ?? '').trim();
				} else if (name === 'switch' && !var1?.getElementByTypes('magic-word, template')) {
					const key = String(var1 ?? '').trim();
					let defaultVal = '',
						found = false,
						transclusion = false;
					for (let j = 2; j < length; j++) {
						const {anon, name: option, value, firstChild} = childNodes[j] as ParameterToken;
						transclusion = Boolean(firstChild.getElementByTypes<TranscludeToken>('magic-word, template'));
						if (anon) {
							if (j === length - 1) {
								defaultVal = value;
							} else if (transclusion) {
								break;
							} else {
								found ||= key === value;
							}
						} else if (transclusion) {
							break;
						} else if (found || option === key) {
							replace = value;
							break;
						} else if (option.toLowerCase() === '#default') {
							defaultVal = value;
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
				target.replaceWith(replace);
			}
		}
	};

classes['ExtendedTableToken'] = __filename;
