import {generateForSelf} from '../util/lint';
import {noWrap} from '../util/string';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {fixedToken} from '../mixin/fixed';
import {attributesParent} from '../mixin/attributesParent';
import Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {AstNodes, AttributesToken, TranscludeToken} from '../internal';

const magicWords = new Set(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']),
	formattingTags = new Set([
		'b',
		'big',
		'center',
		'cite',
		'code',
		'del',
		'dfn',
		'em',
		'font',
		'i',
		'ins',
		'kbd',
		'mark',
		'pre',
		'q',
		's',
		'samp',
		'small',
		'strike',
		'strong',
		'sub',
		'sup',
		'tt',
		'u',
		'var',
	]),
	obsoleteTags = new Set(['strike', 'big', 'center', 'font', 'tt']);

/* NOT FOR BROWSER */

export interface HtmlToken extends AttributesParentBase {}

/* NOT FOR BROWSER END */

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
@fixedToken
@attributesParent()
export abstract class HtmlToken extends Token {
	override readonly type = 'html';
	declare readonly name: string;
	#closing;
	#selfClosing;
	#tag;

	declare readonly childNodes: readonly [AttributesToken];
	abstract override get children(): [AttributesToken];
	abstract override get firstChild(): AttributesToken;
	abstract override get firstElementChild(): AttributesToken;
	abstract override get lastChild(): AttributesToken;
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
		} else if (this.selfClosing) {
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
		} else if (this.closing) {
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
	override toString(): string {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.toString()}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @override */
	override text(): string {
		const {closing, name} = this,
			tag = `${this.#tag}${closing ? '' : super.text()}`,
			{html} = this.getAttribute('config');
		if (html[2].includes(name)) {
			return closing && name !== 'br' ? '' : `<${tag}>`;
		}
		return `<${closing ? '/' : ''}${tag}${this.#selfClosing && html[1].includes(name) ? '/' : ''}>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		/* NOT FOR BROWSER */

		if (key === 'tag') {
			return this.#tag as TokenAttributeGetter<T>;
		}

		/* NOT FOR BROWSER END */

		return key === 'padding'
			? this.#tag.length + (this.closing ? 2 : 1) as TokenAttributeGetter<T>
			: super.getAttribute(key);
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		let refError: LintError | undefined;
		if (this.name === 'h1' && !this.closing) {
			refError = generateForSelf(this, {start}, '<h1>');
			errors.push(refError);
		}
		if (this.closest('table-attrs')) {
			refError ??= generateForSelf(this, {start}, '');
			errors.push({
				...refError,
				message: Parser.msg('HTML tag in table attributes'),
			});
		}
		try {
			this.findMatchingTag();
		} catch (e) {
			if (e instanceof SyntaxError) {
				const {message} = e;
				refError ??= generateForSelf(this, {start}, '');
				const [msg] = message.split(':'),
					error = {...refError, message: Parser.msg(msg!)};
				if (msg === 'unclosed tag' && !this.closest('heading-title')) {
					if (formattingTags.has(this.name)) {
						const childNodes = this.parentNode?.childNodes,
							i = childNodes?.indexOf(this);
						if (!childNodes?.slice(0, i).some(({type, name}) => type === 'html' && name === this.name)) {
							error.severity = 'warning';
						}
					} else {
						error.severity = 'warning';
					}
				} else if (msg === 'unmatched closing tag') {
					const ancestor = this.closest<TranscludeToken>('magic-word');
					if (ancestor && magicWords.has(ancestor.name)) {
						error.severity = 'warning';
					}
				}
				errors.push(error);
			}
		}
		if (obsoleteTags.has(this.name)) {
			refError ??= generateForSelf(this, {start}, '');
			errors.push({
				...refError,
				message: Parser.msg('obsolete HTML tag'),
				severity: 'warning',
			});
		}
		if ((this.name === 'b' || this.name === 'strong') && this.closest('heading-title')) {
			refError ??= generateForSelf(this, {start}, '');
			errors.push({
				...refError,
				message: Parser.msg('bold in section header'),
				severity: 'warning',
			});
		}
		return errors;
	}

	/**
	 * 搜索匹配的标签
	 * @throws `SyntaxError` 同时闭合和自封闭的标签
	 * @throws `SyntaxError` 无效自封闭标签
	 * @throws `SyntaxError` 未匹配的标签
	 */
	findMatchingTag(): this | undefined {
		const {html} = this.getAttribute('config'),
			{name: tagName, parentNode, closing} = this,
			string = noWrap(String(this));
		if (closing && (this.#selfClosing || html[2].includes(tagName))) {
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
			siblings = (closing ? childNodes.slice(0, i).reverse() : childNodes.slice(i + 1))
				.filter((child: AstNodes): child is this => child.type === 'html' && child.name === tagName);
		let imbalance = closing ? -1 : 1;
		for (const token of siblings) {
			if (token.#closing) {
				imbalance--;
			} else {
				imbalance++;
			}
			if (imbalance === 0) {
				return token;
			}
		}
		throw new SyntaxError(`${closing ? 'unmatched closing' : 'unclosed'} tag: ${string}`);
	}

	/** @override */
	override print(): string {
		const {closing, name} = this,
			{html} = this.getAttribute('config');
		return super.print({
			pre: `&lt;${this.closing ? '/' : ''}${this.#tag}`,
			post: `${this.#selfClosing ? '/' : ''}&gt;`,
			class: closing && html[2].includes(name) && name !== 'br' ? 'html-invalid' : 'html',
		});
	}

	/** @override */
	override json(): object {
		return {
			...super.json(),
			closing: this.closing,
			selfClosing: this.#selfClosing,
		};
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [attr] = this.cloneChildNodes() as [AttributesToken],
			config = this.getAttribute('config');
		// @ts-expect-error abstract class
		return Shadow.run(() => new HtmlToken(this.#tag, attr, this.closing, this.selfClosing, config) as this);
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
			{parentNode, name: tagName, firstChild, selfClosing} = this;
		if (!parentNode || !selfClosing || !config.html[0].includes(tagName)) {
			return;
		} else if (firstChild.text().trim()) {
			this.#selfClosing = false;
			this.after(Parser.parse(`</${this.name}>`, false, 3, this.getAttribute('config')).firstChild!);
			return;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			prevSiblings = childNodes.slice(0, i)
				.filter((child): child is this => child.type === 'html' && child.name === tagName),
			imbalance = prevSiblings.reduce((acc, {closing}) => acc + (closing ? 1 : -1), 0);
		if (imbalance < 0) {
			this.#selfClosing = false;
			this.#closing = true;
		} else {
			throw new Error(`无法修复无效自封闭标签：前文共有 ${imbalance} 个未匹配的闭合标签`);
		}
	}
}

classes['HtmlToken'] = __filename;
