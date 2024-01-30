import {extUrlChar, extUrlCharFirst} from '../util/string';
import {generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from './index';
import type {
	LintError,
} from '../base';
import type {AtomToken, SyntaxToken, TranscludeToken} from '../internal';

/**
 * 准确获取参数名
 * @param name 预定的参数名
 */
const getName = (name: Token): string => name.text().replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
export abstract class ParameterToken extends Token {
	override readonly type = 'parameter';
	declare readonly name: string;

	declare readonly childNodes: readonly [Token, Token];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): Token;
	abstract override get parentNode(): TranscludeToken | undefined;
	abstract override get nextSibling(): this | undefined;
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
		if (!this.anon) {
			const {parentNode, firstChild} = this,
				name = getName(firstChild);
			this.setAttribute('name', name);
			if (parentNode) {
				parentNode.getArgs(name, false, false).add(this);
			}
		}
	}

	/** @private */
	override toString(): string {
		return this.anon ? String(this.lastChild) : super.toString('=');
	}

	/** @override */
	override text(): string {
		return this.anon ? this.lastChild.text() : super.text('=');
	}

	/** @private */
	override getGaps(): number {
		return this.anon ? 0 : 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		/https?:\/\/(?:\[[\da-f:.]+\]|[^[\]<>"\t\n\p{Zs}])(?:[^[\]<>"\0\t\n\p{Zs}]|\0\d+c\x7F)*$/iu;
		const errors = super.lint(start),
			{firstChild} = this,
			link = new RegExp(`https?://${extUrlCharFirst}${extUrlChar}$`, 'iu').exec(firstChild.text())?.[0];
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
}
