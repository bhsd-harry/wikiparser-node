import {
	BuildMethod,
} from '../../util/constants';
import {cached} from '../../mixin/cached';
import {Token} from '../index';
import {
	TableBaseToken,
} from './base';
import type {
	Config,
} from '../../base';
import type {SyntaxToken, AttributesToken, TrToken, TableToken} from '../../internal';

/* NOT FOR BROWSER */

import {newline} from '../../util/string';

/* NOT FOR BROWSER END */

export type TdSubtypes = 'td' | 'th' | 'caption';
declare interface TdSyntax {
	subtype: TdSubtypes;
}

/**
 * `<td>`, `<th>` or `<caption>`
 *
 * `<td>`、`<th>`或`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
export abstract class TdToken extends TableBaseToken {
	#innerSyntax = '';

	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, Token];
	abstract override get parentNode(): TrToken | TableToken | undefined;
	abstract override get nextSibling(): TrToken | SyntaxToken | this | undefined;
	abstract override get previousSibling(): Token | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, AttributesToken, Token];

	/* NOT FOR BROWSER END */

	override get type(): 'td' {
		return 'td';
	}

	/** cell type / 单元格类型 */
	get subtype(): TdSubtypes {
		return this.#getSyntax().subtype;
	}

	/**
	 * @param syntax 单元格语法
	 * @param inner 内部wikitext
	 */
	constructor(syntax: string, inner?: string, config?: Config, accum: Token[] = []) {
		let innerSyntax = /\||\0\d+!\x7F/u.exec(inner ?? ''),
			attr = innerSyntax ? inner!.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/u.test(attr)) {
			innerSyntax = null;
			attr = '';
		}
		super(
			/^(?:\n[^\S\n]*(?:[|!]|\|\+|\{\{\s*!\s*\}\}\+?)|(?:\||\{\{\s*!\s*\}\}){2}|!!|\{\{\s*!!\s*\}\})$/u,
			syntax,
			'td',
			attr,
			config,
			accum,
			{SyntaxToken: 0, AttributesToken: 1, Token: 2},
		);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		const innerToken = new Token(
			inner?.slice((innerSyntax?.index ?? NaN) + this.#innerSyntax.length),
			config,
			accum,
		);
		innerToken.type = 'td-inner';
		innerToken.setAttribute('stage', 4);
		this.insertAt(innerToken);
	}

	/** 表格语法信息 */
	@cached(false)
	#getSyntax(): TdSyntax {
		const syntax = this.firstChild.text(),
			char = syntax.slice(-1);
		let subtype: TdSubtypes = 'td';
		if (char === '!') {
			subtype = 'th';
		} else if (char === '+') {
			subtype = 'caption';
		}
		if (this.isIndependent()) {
			return {
				subtype,
			};
		}
		const {previousSibling} = this;

		/* NOT FOR BROWSER */

		if (!(previousSibling instanceof TdToken)) {
			return {subtype};
		}

		/* NOT FOR BROWSER END */

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const result = {...(previousSibling as TdToken).#getSyntax()};

		/* NOT FOR BROWSER */

		if (subtype === 'th' && result.subtype !== 'th') {
			result.subtype = 'th';
		}

		/* NOT FOR BROWSER END */

		return result;
	}

	/** @private */
	override afterBuild(): void {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax, BuildMethod.String);
		}
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		const [syntax, attr, inner] = this.childNodes;
		return syntax.toString(skip) + attr.toString(skip) + this.#innerSyntax + inner.toString(skip);
	}

	/** @private */
	override text(): string {
		const [syntax, attr, inner] = this.childNodes;
		return syntax.text() + attr.text() + this.#innerSyntax + inner.text();
	}

	/** @private */
	override getGaps(i: number): number {
		// eslint-disable-next-line unicorn/prefer-ternary
		if (i === 1) {
			return this.#innerSyntax.length;
		}
		return 0;
	}

	/**
	 * Check if the cell is at the beginning of a line
	 *
	 * 是否位于行首
	 */
	isIndependent(): boolean {
		return this.firstChild.text().startsWith('\n');
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const token = super.cloneNode();
		token.setAttribute('innerSyntax', this.#innerSyntax);
		return token;
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		if (key === 'innerSyntax') {
			this.#innerSyntax = (value ?? '') as string;
		} else {
			super.setAttribute(key, value);
		}
	}

	/** @ignore */
	#toHtmlOrPlain(opt?: Omit<HtmlOpt, 'nocc'>): [string, string, string] {
		const {lastChild, nextSibling} = this,
			notEOL = nextSibling?.toString().startsWith('\n') === false,
			lf = opt?.nowrap ? ' ' : '\n';
		let html = lastChild.toHtmlInternal(opt).replace(/^[^\S\n]*/u, '');
		if (notEOL) {
			html = html.replace(/(?<=[\S\n])[^\S\n]*$/u, '');
		}
		return [lf, html, notEOL ? '' : lf];
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		const {subtype, childNodes: [, attr]} = this,
			[lf, html, lfAfter] = this.#toHtmlOrPlain(opt);
		return `${lf}<${subtype}${attr.toHtmlInternal({render: opt?.render})}>${
			subtype === 'caption' ? newline(html) : html
		}${lfAfter}</${subtype}>`;
	}
}
