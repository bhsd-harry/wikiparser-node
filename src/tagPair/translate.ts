import {trimLc} from '../../util/string';
import {Token} from '../index';
import {TagPairToken} from './index';
import {SyntaxToken} from '../syntax';
import type {Config} from '../../base';
import type {AttributesParentBase} from '../../mixin/attributesParent';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
 * `<translate>`
 * @classdesc `{childNodes: [SyntaxToken, Token]}`
 */
export abstract class TranslateToken extends TagPairToken implements Omit<
	AttributesParentBase,
	'className' | 'classList' | 'id' | 'css'
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

	/* NOT FOR BROWSER */

	/** @implements */
	get attributes(): {nowrap?: true} {
		return this.getAttrs();
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 */
	constructor(attr?: string, inner?: string, config?: Config, accum?: Token[]) {
		const attrToken = new SyntaxToken(
				attr,
				/^(?: nowrap)?$/u,
				'translate-attr',
				config,
				accum,
				{AstText: ':'},
			),
			innerToken = new Token(inner, config, accum);
		innerToken.type = 'translate-inner';
		super('translate', attrToken, innerToken, '</translate>', config, accum);
		this.seal('closed', true);
		this.seal('selfClosing', true);
	}

	/** 是否有nowrap属性 */
	#isNowrap(): boolean {
		return this.firstChild.toString() === ' nowrap';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? this.lastChild.toString(true) : super.toString();
	}

	/** @private */
	override text(): string {
		return this.lastChild.text();
	}

	/** @implements */
	getAttr(key: string): true | undefined {
		return trimLc(key) === 'nowrap' && this.#isNowrap() || undefined;
	}

	/* NOT FOR BROWSER */

	/**
	 * 设置nowrap属性
	 * @param nowrap 是否nowrap
	 */
	#setNowrap(nowrap: unknown): void {
		this.firstChild.setText(nowrap ? ' nowrap' : '');
	}

	/** @implements */
	hasAttr(key: string): boolean {
		return trimLc(key) === 'nowrap' && this.#isNowrap();
	}

	/** @implements */
	getAttrNames(): Set<string> {
		return new Set(this.#isNowrap() ? ['nowrap'] : undefined);
	}

	/** @implements */
	getAttrs(): {nowrap?: true} {
		return this.#isNowrap() ? {nowrap: true} : {};
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
			const token = new TranslateToken(attr, undefined, config) as this;
			token.lastChild.safeReplaceWith(inner);
			return token;
		});
	}

	/** @private */
	override toHtmlInternal(opt?: HtmlOpt): string {
		return this.lastChild.toHtmlInternal(opt);
	}
}

classes['TranslateToken'] = __filename;
