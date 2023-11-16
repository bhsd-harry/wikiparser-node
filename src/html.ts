import {generateForSelf} from '../util/lint';
import {noWrap} from '../util/string';
import Parser from '../index';
import {Token} from '.';
import type {LintError} from '../index';
import type {AttributesToken, TranscludeToken} from '../internal';

const magicWords = new Set(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']);

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
export abstract class HtmlToken extends Token {
	/** @browser */
	override readonly type = 'html';
	declare name: string;
	declare childNodes: [AttributesToken];
	abstract override get firstChild(): AttributesToken;
	abstract override get lastChild(): AttributesToken;

	/** @browser */
	#closing;
	/** @browser */
	#selfClosing;
	/** @browser */
	#tag;

	/**
	 * 是否是闭合标签
	 * @browser
	 */
	get closing(): boolean {
		return this.#closing;
	}

	/**
	 * @browser
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
		super(undefined, config, true, accum);
		this.insertAt(attr);
		this.setAttribute('name', name.toLowerCase());
		this.#closing = closing;
		this.#selfClosing = selfClosing;
		this.#tag = name;
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		return `<${this.#closing ? '/' : ''}${this.#tag}${super.toString()}${this.#selfClosing ? '/' : ''}>`;
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return `<${this.#closing ? '/' : ''}${this.#tag}${
			this.#closing ? '' : super.text()
		}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @private */
	protected override getPadding(): number {
		return this.#tag.length + (this.#closing ? 2 : 1);
	}

	/**
	 * @override
	 * @browser
	 */
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
	 * @browser
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
			if (token.closing) {
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
}
