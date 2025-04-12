import {Token} from '../index';
import {TagPairToken} from './index';
import {SyntaxToken} from '../syntax';
import {NoincludeToken} from '../nowiki/noinclude';
import type {Config} from '../../base';

/**
 * `<translate>`
 * @classdesc `{childNodes: [SyntaxToken, Token]}`
 */
export abstract class TranslateToken extends TagPairToken {
	declare name: 'translate';
	declare closed: true;
	declare selfClosing: false;

	declare readonly childNodes: readonly [SyntaxToken, Token];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): Token;

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
			'translate-attr',
			config,
			accum,
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
}
