import {
	extUrlChar,
	extUrlCharFirst,
} from '../util/string';
import {generateForChild, fixByEscape} from '../util/lint';
import Parser from '../index';
import {Token} from './index';
import type {
	Config,
	LintError,
	AST,
} from '../base';
import type {AtomToken, SyntaxToken, TranscludeToken} from '../internal';

const linkRegex = /* #__PURE__ */ (() =>
	new RegExp(`https?://${extUrlCharFirst}${extUrlChar}$`, 'iu'))();

/**
 * template or magic word parameter
 *
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
export abstract class ParameterToken extends Token {
	declare readonly name: string;

	declare readonly childNodes: readonly [Token, Token];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): Token;
	abstract override get parentNode(): TranscludeToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): AtomToken | SyntaxToken | this | undefined;

	override get type(): 'parameter' {
		return 'parameter';
	}

	/** whether to be anonymous / 是否是匿名参数 */
	get anon(): boolean {
		return this.firstChild.length === 0;
	}

	/* PRINT ONLY */

	/** whether to be a duplicated parameter / 是否是重复参数 */
	get duplicated(): boolean {
		LSP: { // eslint-disable-line no-unused-labels
			try {
				return Boolean(this.parentNode?.getDuplicatedArgs().some(([key]) => key === this.name));
			} catch {
				return false;
			}
		}
	}

	/* PRINT ONLY END */

	/**
	 * @param key 参数名
	 * @param value 参数值
	 */
	constructor(key?: string | number, value?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum);
		const keyToken = new Token(typeof key === 'number' ? undefined : key, config, accum, {
			}),
			token = new Token(value, config, accum);
		keyToken.type = 'parameter-key';
		keyToken.setAttribute('stage', 2);
		token.type = 'parameter-value';
		token.setAttribute('stage', 2);
		this.append(keyToken, token);
	}

	/** @private */
	trimName(name: string | Token, set = true): string {
		const trimmed = (typeof name === 'string' ? name : name.toString(true))
			.replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');
		this.setAttribute('name', trimmed);
		return trimmed;
	}

	/** @private */
	override afterBuild(): void {
		if (!this.anon) {
			const {parentNode, firstChild} = this,
				name = this.trimName(firstChild);
			if (parentNode) {
				parentNode.getArgs(name, false, false).add(this);
			}
		}
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		return this.anon ? this.lastChild.toString(skip) : super.toString(skip, '=');
	}

	override text(): string {
		return this.anon ? this.lastChild.text() : super.text('=');
	}

	/** @private */
	override getGaps(): number {
		return this.anon ? 0 : 1;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				rule = 'unescaped',
				{lintConfig} = Parser,
				s = lintConfig.getSeverity(rule);
			if (s) {
				const {firstChild} = this,
					link = linkRegex.exec(firstChild.text())?.[0];
				try {
					if (link && new URL(link).search) {
						const e = generateForChild(firstChild, {start}, rule, 'unescaped-query', s);
						e.startIndex = e.endIndex;
						e.startLine = e.endLine;
						e.startCol = e.endCol;
						e.endIndex++;
						e.endCol++;
						if (lintConfig.computeEditInfo || lintConfig.fix) {
							e.fix = fixByEscape(e.startIndex, '{{=}}');
						}
						errors.push(e);
					}
				} catch {}
			}
			return errors;
		}
	}

	/** @private */
	override print(): string {
		return super.print({sep: this.anon ? '' : '='});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		LSP: { // eslint-disable-line no-unused-labels
			Object.assign(json, {anon: this.anon}, this.duplicated && {duplicated: true});
			return json;
		}
	}
}
