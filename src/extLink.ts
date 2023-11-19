import {noWrap, normalizeSpace} from '../util/string';
import Parser from '../index';
import {Token} from '.';
import {MagicLinkToken} from './magicLink';

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
export class ExtLinkToken extends Token {
	/** @browser */
	override readonly type = 'ext-link';
	declare childNodes: [MagicLinkToken] | [MagicLinkToken, Token];
	// @ts-expect-error abstract method
	abstract override get children(): [MagicLinkToken] | [MagicLinkToken, Token];
	// @ts-expect-error abstract method
	abstract override get firstChild(): MagicLinkToken;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): MagicLinkToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): Token;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): Token;

	/** @browser */
	#space;

	/** 协议 */
	get protocol(): string | undefined {
		return this.firstChild.protocol;
	}

	set protocol(value) {
		this.firstChild.protocol = value;
	}

	/** 和内链保持一致 */
	get link(): string {
		return this.firstChild.link;
	}

	set link(url) {
		this.setTarget(url);
	}

	/** 链接显示文字 */
	get innerText(): string {
		return this.length > 1
			? this.lastChild.text()
			: `[${this.getRootNode().querySelectorAll('ext-link[childElementCount=1]').indexOf(this) + 1}]`;
	}

	/**
	 * @browser
	 * @param url 网址
	 * @param space 空白字符
	 * @param text 链接文字
	 */
	constructor(url?: string, space = '', text = '', config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum, {
			MagicLinkToken: 0, Token: 1,
		});
		this.insertAt(new MagicLinkToken(url, true, config, accum));
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum, {
				'Stage-7': ':', ConverterToken: ':',
			});
			inner.type = 'ext-link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
		this.protectChildren(0);
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		if (omit && this.matchesTypes(omit)) {
			return '';
		} else if (this.length === 1) {
			return `[${super.toString(omit)}${this.#space}]`;
		}
		this.#correct();
		normalizeSpace(this.lastChild);
		return `[${super.toString(omit, this.#space)}]`;
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		normalizeSpace(this.childNodes[1]);
		return `[${super.text(' ')}]`;
	}

	/** @private */
	protected override getPadding(): number {
		return 1;
	}

	/** @private */
	protected override getGaps(i: number): number {
		this.#correct();
		return i === 0 ? this.#space.length : 0;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print(
			this.length === 1 ? {pre: '[', post: `${this.#space}]`} : {pre: '[', sep: this.#space, post: ']'},
		);
	}

	/** @override */
	override cloneNode(): this {
		const [url, text] = this.cloneChildNodes() as [MagicLinkToken, Token?];
		return Parser.run(() => {
			const token = new ExtLinkToken(undefined, '', '', this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(url);
			if (text) {
				token.insertAt(text);
			}
			return token;
		});
	}

	/** 修正空白字符 */
	#correct(): void {
		if (!this.#space && this.length > 1
			// 都替换成`<`肯定不对，但无妨
			&& /^[^[\]<>"{\0-\x1F\x7F\p{Zs}\uFFFD]/u.test(this.lastChild.text().replace(/&[lg]t;/u, '<'))
		) {
			this.#space = ' ';
		}
	}

	/** 获取网址 */
	getUrl(): URL {
		return this.firstChild.getUrl();
	}

	/**
	 * 设置链接目标
	 * @param url 网址
	 * @throws `SyntaxError` 非法的外链目标
	 */
	setTarget(url: string): void {
		const root = Parser.parse(`[${url}]`, this.getAttribute('include'), 8, this.getAttribute('config')),
			{length, firstChild: extLink} = root;
		if (length !== 1 || !(extLink instanceof ExtLinkToken) || extLink.length !== 1) {
			throw new SyntaxError(`非法的外链目标：${url}`);
		}
		const {firstChild} = extLink;
		extLink.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置链接显示文字
	 * @param str 链接显示文字
	 * @throws `SyntaxError` 非法的链接显示文字
	 */
	setLinkText(str: string): void {
		const root = Parser.parse(`[//url ${str}]`, this.getAttribute('include'), 8, this.getAttribute('config')),
			{length, firstChild: extLink} = root;
		if (length !== 1 || !(extLink instanceof ExtLinkToken) || extLink.length !== 2) {
			throw new SyntaxError(`非法的外链文字：${noWrap(str)}`);
		}
		const {lastChild} = extLink;
		if (this.length === 1) {
			this.insertAt(lastChild);
		} else {
			this.lastChild.safeReplaceWith(lastChild);
		}
		this.#space ||= ' ';
	}
}

Parser.classes['ExtLinkToken'] = __filename;
