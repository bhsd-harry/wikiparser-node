import {Token} from '../index';
import {TagPairToken} from './index';
import {SyntaxToken} from '../syntax';
import {TvarToken} from '../tag/tvar';
import type {Config} from '../../base';

/**
 * `<translate>`
 * @classdesc `{childNodes: [SyntaxToken, Token]}`
 */
export abstract class TranslateToken extends TagPairToken {
	declare name: 'translate';
	declare closed: true;

	declare readonly childNodes: readonly [SyntaxToken, Token];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): Token;
	abstract override get innerText(): string;

	override get type(): 'translate' {
		return 'translate';
	}

	override get selfClosing(): false {
		return false;
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
			/<tvar(\|[^>]+)>([\s\S]*?)<\/>/gu,
			(_, p1: string, p2: string) => {
				// @ts-expect-error abstract class
				new TvarToken('tvar', p1, false, config, accum);
				// @ts-expect-error abstract class
				new TvarToken('', '', true, config, accum);
				return `\0${accum.length - 2}n\x7F${p2}\0${accum.length}n\x7F`;
			},
		).replace(
			/<(tvar)(\s+name\s*=(?:\s*(?:(["'])[\s\S]*?\3|[^"'\s>]+))?\s*)>([\s\S]*?)<\/(tvar)(\s*)>/giu,
			(_, p1: string, p2: string, __, p3: string, p4: string, p5: string) => {
				// @ts-expect-error abstract class
				new TvarToken(p1, p2, false, config, accum);
				// @ts-expect-error abstract class
				new TvarToken(p4, p5, true, config, accum);
				return `\0${accum.length - 2}n\x7F${p3}\0${accum.length}n\x7F`;
			},
		);
		const innerToken = new Token(inner, config, accum);
		innerToken.type = 'translate-inner';
		super('translate', attrToken, innerToken, 'translate', config, accum);

		/* PRINT ONLY */

		this.seal('closed', true);
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
		PRINT: return this.firstChild.toString() === ' nowrap';
	}

	/** @private */
	override print(): string {
		PRINT: return `<span class="wpb-ext">&lt;translate${
			this.#isNowrap()
				? '<span class="wpb-ext-attrs"> <span class="wpb-ext-attr">'
				+ '<span class="wpb-attr-key">nowrap</span>'
				+ '</span></span>'
				: ''
		}&gt;${this.lastChild.print({class: 'ext-inner'})}&lt;/translate&gt;</span>`;
	}
}
