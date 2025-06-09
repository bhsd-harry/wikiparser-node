import {Token} from '../index';
import {TagPairToken} from './index';
import {SyntaxToken} from '../syntax';
import {NoincludeToken} from '../nowiki/noinclude';
import type {Config} from '../../base';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {trimLc} from '../../util/string';
import type {AttributesParentBase} from '../../mixin/attributesParent';
import type {CommentToken} from '../../internal';

/* NOT FOR BROWSER END */

/**
 * `<translate>`
 * @classdesc `{childNodes: [SyntaxToken, Token]}`
 */
export abstract class TranslateToken extends TagPairToken implements Omit<
	AttributesParentBase,
	'attributes' | 'className' | 'classList' | 'id' | 'getAttrNames' | 'getAttrs' | 'css'
> {
	declare name: 'translate';
	declare closed: true;
	declare selfClosing: false;

	declare readonly childNodes: readonly [SyntaxToken, Token];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, Token];
	abstract override get firstElementChild(): SyntaxToken;
	abstract override get lastElementChild(): Token;

	/* NOT FOR BROWSER END */

	override get type(): 'translate' {
		return 'translate';
	}

	/**
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 */
	constructor(attr?: string, inner?: string, config?: Config, accum: Token[] = []) {
		const attrToken = new SyntaxToken(
			attr,
			/^(?: nowrap)?$/u,
			'translate-attr',
			config,
			accum,
			{AstText: ':'},
		);
		inner = inner?.replace(
			/(<tvar\|[^>]+>)([\s\S]*?)(<\/>)/gu,
			(_, p1: string, p2: string, p3: string) => {
				// @ts-expect-error abstract class
				new NoincludeToken(p1, config, accum);
				// @ts-expect-error abstract class
				new NoincludeToken(p3, config, accum);
				return `\0${accum.length - 1}n\x7F${p2}\0${accum.length}n\x7F`;
			},
		).replace(
			/(<tvar\s+name\s*=(?:\s*(?:(["'])[\s\S]*?\2|[^"'\s>]+))?\s*>)([\s\S]*?)(<\/tvar\s*>)/giu,
			(_, p1: string, __, p3: string, p4: string) => {
				// @ts-expect-error abstract class
				new NoincludeToken(p1, config, accum);
				// @ts-expect-error abstract class
				new NoincludeToken(p4, config, accum);
				return `\0${accum.length - 1}n\x7F${p3}\0${accum.length}n\x7F`;
			},
		);
		const innerToken = new Token(inner, config, accum);
		innerToken.type = 'translate-inner';
		super('translate', attrToken, innerToken, 'translate', config, accum);

		/* PRINT ONLY */

		this.seal('closed', true);
		this.seal('selfClosing', true);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? this.lastChild.toString(true) : super.toString();
	}

	/** @private */
	override text(): string {
		return this.lastChild.text();
	}

	/* PRINT ONLY */

	/** 是否有nowrap属性 */
	#isNowrap(): boolean {
		return this.firstChild.toString() === ' nowrap';
	}

	/** @private */
	override print(): string {
		return `<span class="wpb-ext">&lt;translate${
			this.#isNowrap()
				? '<span class="wpb-ext-attrs"> <span class="wpb-ext-attr">'
				+ '<span class="wpb-attr-key">nowrap</span>'
				+ '</span></span>'
				: ''
		}&gt;${this.lastChild.print({class: 'ext-inner'})}&lt;/translate&gt;</span>`;
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/**
	 * 设置nowrap属性
	 * @param nowrap 是否nowrap
	 */
	#setNowrap(nowrap: unknown): void {
		this.firstChild.setText(nowrap ? ' nowrap' : '');
	}

	/** @implements */
	getAttr(key: string): true | undefined {
		return trimLc(key) === 'nowrap' && this.#isNowrap() || undefined;
	}

	/** @implements */
	hasAttr(key: string): boolean {
		return trimLc(key) === 'nowrap' && this.#isNowrap();
	}

	/** @implements */
	setAttr(keyOrProp: string | Record<string, string | boolean>, value?: string | boolean): void {
		if (typeof keyOrProp === 'object') {
			for (const [key, val] of Object.entries(keyOrProp)) {
				this.setAttr(key, val);
			}
		} else if (trimLc(keyOrProp) === 'nowrap') {
			this.#setNowrap(value);
		}
	}

	/** @implements */
	removeAttr(key: string): void {
		if (trimLc(key) === 'nowrap') {
			this.firstChild.replaceChildren();
		}
	}

	/** @implements */
	toggleAttr(key: string, force?: boolean): void {
		if (trimLc(key) === 'nowrap') {
			this.#setNowrap(force ?? !this.#isNowrap());
		}
	}

	override cloneNode(): this {
		const inner = this.lastChild.cloneNode(),
			config = this.getAttribute('config'),
			attr = this.firstChild.toString() || undefined;
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new TranslateToken(attr, undefined, config);
			token.lastChild.safeReplaceWith(inner);
			return token;
		});
	}

	/** @private */
	override toHtmlInternal(opt?: HtmlOpt): string {
		for (const {innerText, nextSibling} of this.querySelectorAll<CommentToken>('comment')) {
			if (
				nextSibling?.type === 'text' && /^T:[^_/\n<>~]+$/u.test(innerText) && /^[\n ]/u.test(nextSibling.data)
			) {
				nextSibling.deleteData(0, 1);
			}
		}
		return this.lastChild.toHtmlInternal(opt);
	}
}

classes['TranslateToken'] = __filename;
