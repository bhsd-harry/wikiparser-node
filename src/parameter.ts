import {noWrap, extUrlChar, extUrlCharFirst} from '../util/string';
import {generateForChild} from '../util/lint';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError} from '../index';
import type {AtomToken, SyntaxToken, TranscludeToken} from '../internal';

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
export class ParameterToken extends fixed(Token) {
	override readonly type = 'parameter';
	declare name: string;

	declare childNodes: [Token, Token];
	// @ts-expect-error abstract method
	abstract override get firstChild(): Token;
	// @ts-expect-error abstract method
	abstract override get lastChild(): Token;
	// @ts-expect-error abstract method
	abstract override get parentNode(): TranscludeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): this | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AtomToken | SyntaxToken | this;

	/** 是否是匿名参数 */
	get anon(): boolean {
		return this.firstChild.length === 0;
	}

	/**
	 * @param key 参数名
	 * @param value 参数值
	 */
	constructor(key?: string | number, value?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum);
		const keyToken = new Token(typeof key === 'number' ? undefined : key, config, accum, {
			}),
			token = new Token(value, config, accum);
		keyToken.type = 'parameter-key';
		token.type = 'parameter-value';
		token.setAttribute('stage', 2);
		this.append(keyToken, token);
	}

	/** @private */
	override afterBuild(): void {
		const omit = new Set(['comment', 'noinclude', 'include']);
		if (!this.anon) {
			const name = this.firstChild.toString(omit).replace(/^[ \t\n\0\v]+|(?<=[^ \t\n\0\v])[ \t\n\0\v]+$/gu, ''),
				{parentNode} = this;
			this.setAttribute('name', name);
			if (parentNode) {
				parentNode.getArgs(name, false, false).add(this);
			}
		}
	}

	/** @override */
	override toString(omit?: Set<string>): string {
		return this.anon && !(omit && this.matchesTypes(omit))
			? this.lastChild.toString(omit)
			: super.toString(omit, '=');
	}

	/** @override */
	override text(): string {
		return this.anon ? this.lastChild.text() : super.text('=');
	}

	/** @private */
	protected override getGaps(i: number): number {
		return this.anon || i === 1 ? 0 : 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{firstChild, lastChild} = this,
			link = new RegExp(`https?://${extUrlCharFirst}${extUrlChar}$`, 'iu')
				.exec(firstChild.toString(new Set(['comment', 'noinclude', 'include'])))?.[0];
		if (link && new URL(link).search) {
			const e = generateForChild(firstChild, {start}, 'unescaped query string in an anonymous parameter');
			errors.push({
				...e,
				startIndex: e.endIndex,
				endIndex: e.endIndex + 1,
				startLine: e.endLine,
				startCol: e.endCol,
				endCol: e.endCol + 1,
			});
		}
		return errors;
	}

	/** @override */
	override print(): string {
		return super.print({sep: this.anon ? '' : '='});
	}
}
