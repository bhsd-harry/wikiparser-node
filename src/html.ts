import {generateForSelf} from '../util/lint';
import {noWrap} from '../util/string';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';
import type {AstNodes, AttributesToken, TranscludeToken} from '../internal';

const magicWords = new Set(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']);

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
export class HtmlToken extends Token {
	override readonly type = 'html';
	declare readonly name: string;
	#closing;
	#selfClosing;
	#tag;

	declare readonly childNodes: [AttributesToken];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AttributesToken;

	/** 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

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
				const {message: errorMsg} = e;
				refError ??= generateForSelf(this, {start}, '');
				const [msg] = errorMsg.split(':'),
					error = {...refError, message: Parser.msg(msg!)};
				if (msg === 'unclosed tag') {
					error.severity = 'warning';
				} else if (msg === 'unmatched closing tag') {
					const ancestor = this.closest<TranscludeToken>('magic-word');
					if (ancestor && magicWords.has(ancestor.name!)) {
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
}
