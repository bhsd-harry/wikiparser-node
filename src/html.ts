import {generateForSelf} from '../util/lint';
import {noWrap} from '../util/string';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {fixed} from '../mixin/fixed';
import {attributesParent} from '../mixin/attributesParent';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError} from '../index';
import type {AttributesToken, TranscludeToken} from '../internal';

const magicWords = new Set(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']);

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
export class HtmlToken extends attributesParent(fixed(Token)) {
	override readonly type = 'html';
	declare name: string;
	#closing;
	#selfClosing;
	#tag;

	declare childNodes: [AttributesToken];
	// @ts-expect-error abstract method
	abstract override get children(): [AttributesToken];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): AttributesToken;

	/** 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

	/* NOT FOR BROWSER */

	/** @throws `Error` 自封闭标签或空标签 */
	set closing(value) {
		if (!value) {
			this.#closing = false;
			return;
		} else if (this.#selfClosing) {
			throw new Error('这是一个自封闭标签！');
		}
		const {html: [,, tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error('这是一个空标签！');
		}
		this.#closing = true;
	}

	/** 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

	/** @throws `Error` 闭合标签或无效自封闭标签 */
	set selfClosing(value) {
		if (!value) {
			this.#selfClosing = false;
			return;
		} else if (this.#closing) {
			throw new Error('这是一个闭合标签！');
		}
		const {html: [tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error(`<${this.name}>标签自封闭无效！`);
		}
		this.#selfClosing = true;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 * @param selfClosing 是否自封闭
	 */
	constructor(
		name: string,
		attr: AttributesToken,
		closing: boolean,
		selfClosing: boolean,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(undefined, config, accum);
		this.insertAt(attr);
		this.setAttribute('name', name.toLowerCase());
		this.#closing = closing;
		this.#selfClosing = selfClosing;
		this.#tag = name;
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return omit && this.matchesTypes(omit)
			? ''
			: `<${this.#closing ? '/' : ''}${this.#tag}${super.toString(omit)}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @override */
	override text(): string {
		return `<${this.#closing ? '/' : ''}${this.#tag}${
			this.#closing ? '' : super.text()
		}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'tag') {
			return this.#tag as TokenAttributeGetter<T>;
		}
		return key === 'padding'
			? this.#tag.length + (this.#closing ? 2 : 1) as TokenAttributeGetter<T>
			: super.getAttribute(key);
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		let wikitext: string | undefined,
			refError: LintError | undefined;
		if (this.name === 'h1' && !this.#closing) {
			wikitext = String(this.getRootNode());
			refError = generateForSelf(this, {start}, '<h1>');
			errors.push({...refError, excerpt: wikitext.slice(start, start + 50)});
		}
		if (this.closest('table-attrs')) {
			wikitext ??= String(this.getRootNode());
			refError ??= generateForSelf(this, {start}, '');
			errors.push({
				...refError,
				message: Parser.msg('HTML tag in table attributes'),
				excerpt: wikitext.slice(Math.max(0, start - 25), start + 25),
			});
		}
		try {
			this.findMatchingTag();
		} catch (e) {
			if (e instanceof SyntaxError) {
				const {message: errorMsg} = e;
				wikitext ??= String(this.getRootNode());
				refError ??= generateForSelf(this, {start}, '');
				const [msg] = errorMsg.split(':'),
					error = {...refError, message: Parser.msg(msg!)};
				if (msg === 'unclosed tag') {
					error.severity = 'warning';
					error.excerpt = wikitext.slice(start, start + 50);
				} else if (msg === 'unmatched closing tag') {
					const end = start + String(this).length,
						ancestor = this.closest('magic-word') as TranscludeToken | undefined;
					error.excerpt = wikitext.slice(Math.max(0, end - 50), end);
					if (ancestor && magicWords.has(ancestor.name)) {
						error.severity = 'warning';
					}
				}
				errors.push(error);
			}
		}
		return errors;
	}

	/**
	 * 搜索匹配的标签
	 * @throws `SyntaxError` 同时闭合和自封闭的标签
	 * @throws `SyntaxError` 无效自封闭标签
	 * @throws `SyntaxError` 未闭合的标签
	 */
	findMatchingTag(): this | undefined {
		const {html} = this.getAttribute('config'),
			{name: tagName, parentNode} = this,
			string = noWrap(String(this));
		if (this.#closing && (this.#selfClosing || html[2].includes(tagName))) {
			throw new SyntaxError(`tag that is both closing and self-closing: ${string}`);
		} else if (html[2].includes(tagName) || this.#selfClosing && html[1].includes(tagName)) { // 自封闭标签
			return this;
		} else if (this.#selfClosing && html[0].includes(tagName)) {
			throw new SyntaxError(`invalid self-closing tag: ${string}`);
		} else if (!parentNode) {
			return undefined;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			siblings = this.#closing
				? childNodes.slice(0, i).reverse().filter(({type, name}) => type === 'html' && name === tagName)
				: childNodes.slice(i + 1).filter(({type, name}) => type === 'html' && name === tagName);
		let imbalance = this.#closing ? -1 : 1;
		for (const token of siblings as this[]) {
			if (token.#closing) {
				imbalance--;
			} else {
				imbalance++;
			}
			if (imbalance === 0) {
				return token;
			}
		}
		throw new SyntaxError(`${this.#closing ? 'unmatched closing' : 'unclosed'} tag: ${string}`);
	}

	/** @override */
	override print(): string {
		return super.print({
			pre: `&lt;${this.#closing ? '/' : ''}${this.#tag}`,
			post: `${this.#selfClosing ? '/' : ''}&gt;`,
		});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [attr] = this.cloneChildNodes() as [AttributesToken],
			config = this.getAttribute('config');
		return Shadow.run(() => new HtmlToken(this.#tag, attr, this.#closing, this.#selfClosing, config) as this);
	}

	/**
	 * 更换标签名
	 * @param tag 标签名
	 * @throws `RangeError` 非法的HTML标签
	 */
	replaceTag(tag: string): void {
		const name = tag.toLowerCase();
		if (!this.getAttribute('config').html.flat().includes(name)) {
			throw new RangeError(`非法的HTML标签：${tag}`);
		}
		this.setAttribute('name', name);
		this.#tag = tag;
	}

	/**
	 * 修复无效自封闭标签
	 * @throws `Error` 无法修复无效自封闭标签
	 */
	fix(): void {
		const config = this.getAttribute('config'),
			{parentNode, name: tagName, firstChild} = this;
		if (!parentNode || !this.#selfClosing || !config.html[0].includes(tagName)) {
			return;
		} else if (firstChild.text().trim()) {
			this.#selfClosing = false;
			this.after(Parser.parse(`</${this.name}>`, false, 3, this.getAttribute('config')).firstChild!);
			return;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			prevSiblings = childNodes.slice(0, i)
				.filter(({type, name}) => type === 'html' && name === tagName) as this[],
			imbalance = prevSiblings.reduce((acc, {closing}) => acc + (closing ? 1 : -1), 0);
		if (imbalance < 0) {
			this.#selfClosing = false;
			this.#closing = true;
		} else {
			Parser.warn('无法修复无效自封闭标签', noWrap(String(this)));
			throw new Error(`无法修复无效自封闭标签：前文共有 ${imbalance} 个未匹配的闭合标签`);
		}
	}
}

classes['HtmlToken'] = __filename;
