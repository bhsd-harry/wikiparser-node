import {generateForSelf} from '../util/lint';
import {noWrap} from '../util/string';
import Parser from '../index';
import {Token} from './index';
import type {
	Config,
	LintError,
} from '../base';
import type {AstNodes, AttributesToken, TranscludeToken} from '../internal';

const magicWords = new Set<string | undefined>(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']),
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

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
export abstract class HtmlToken extends Token {
	override readonly type = 'html';
	declare readonly name: string;
	#closing;
	#selfClosing;
	#tag;

	declare readonly childNodes: readonly [AttributesToken];
	abstract override get firstChild(): AttributesToken;
	abstract override get lastChild(): AttributesToken;

	/** 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

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
		config?: Config,
		accum?: Token[],
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

	/** @private */
	override text(): string {
		const {
				closing,
			} = this,
			tag = this.#tag + (closing ? '' : super.text());
		return `<${closing ? '/' : ''}${tag}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding'
			? this.#tag.length + (this.closing ? 2 : 1) as TokenAttribute<T>
			: super.getAttribute(key);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		let refError: LintError | undefined;
		if (this.name === 'h1' && !this.closing) {
			refError = generateForSelf(this, {start}, 'h1', '<h1>');
			errors.push(refError);
		}
		if (this.closest('table-attrs')) {
			refError ??= generateForSelf(this, {start}, 'h1', '');
			errors.push({
				...refError,
				rule: 'parsing-order',
				message: Parser.msg('HTML tag in table attributes'),
			});
		}
		try {
			this.findMatchingTag();
		} catch (e) {
			if (e instanceof SyntaxError) {
				const {message} = e;
				refError ??= generateForSelf(this, {start}, 'h1', '');
				const [msg] = message.split(':'),
					error = {...refError, rule: 'unmatched-tag' as LintError.Rule, message: Parser.msg(msg!)};
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
					} else {
						error.suggestions = [
							{
								desc: 'remove',
								range: [start, error.endIndex],
								text: '',
							},
						];
					}
				} else if (msg === 'tag that is both closing and self-closing') {
					const {html: [,, voidTags]} = this.getAttribute('config');
					if (voidTags.includes(this.name)) {
						error.fix = {
							range: [start + 1, start + 2],
							text: '',
						};
					}
				}
				errors.push(error);
			}
		}
		if (obsoleteTags.has(this.name)) {
			refError ??= generateForSelf(this, {start}, 'h1', '');
			errors.push({
				...refError,
				rule: 'obsolete-tag',
				message: Parser.msg('obsolete HTML tag'),
				severity: 'warning',
			});
		}
		if ((this.name === 'b' || this.name === 'strong') && this.closest('heading-title')) {
			refError ??= generateForSelf(this, {start}, 'h1', '');
			errors.push({
				...refError,
				rule: 'bold-header',
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
		const {html: [normalTags, flexibleTags, voidTags]} = this.getAttribute('config'),
			{name: tagName, parentNode, closing} = this,
			string = noWrap(this.toString());
		if (closing && (this.#selfClosing || voidTags.includes(tagName))) {
			throw new SyntaxError(`tag that is both closing and self-closing: ${string}`);
		} else if (voidTags.includes(tagName) || this.#selfClosing && flexibleTags.includes(tagName)) { // 自封闭标签
			return this;
		} else if (this.#selfClosing && normalTags.includes(tagName)) {
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
