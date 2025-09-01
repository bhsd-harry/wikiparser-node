import {
	extUrlChar,
	extUrlCharFirst,

	/* NOT FOR BROWSER */

	removeCommentLine,
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

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {fixedToken} from '../mixin/fixed';

/* NOT FOR BROWSER END */

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/https?:\/\/(?:\[[\da-f:.]+\]|[^[\]<>"\t\n\p{Zs}])[^[\]<>"\0\t\n\p{Zs}]*$/iu;
const linkRegex = /* #__PURE__ */ (() =>
	new RegExp(`https?://${extUrlCharFirst}${extUrlChar}$`, 'iu'))();

/**
 * template or magic word parameter
 *
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
@fixedToken
export abstract class ParameterToken extends Token {
	declare readonly name: string;

	declare readonly childNodes: readonly [Token, Token];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): Token;
	abstract override get parentNode(): TranscludeToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): AtomToken | SyntaxToken | this | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [Token, Token];
	abstract override get firstElementChild(): Token;
	abstract override get lastElementChild(): Token;
	abstract override get parentElement(): TranscludeToken | undefined;
	abstract override get nextElementSibling(): this | undefined;
	abstract override get previousElementSibling(): AtomToken | SyntaxToken | this | undefined;

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	set duplicated(value) {
		if (this.duplicated && !value) {
			this.parentNode!.fixDuplication();
		}
	}

	set anon(value) { // eslint-disable-line grouped-accessor-pairs, jsdoc/require-jsdoc
		if (value) {
			throw new Error('Cannot convert named parameter to anonymous parameter!');
		}
		this.parentNode?.anonToNamed();
	}

	/** parameter value / 参数值 */
	get value(): string {
		return this.getValue();
	}

	set value(value) {
		this.setValue(value);
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param key 参数名
	 * @param value 参数值
	 */
	constructor(key?: string | number, value?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum);
		const keyToken = new Token(typeof key === 'number' ? undefined : key, config, accum, {
				'Stage-11': ':', '!HeadingToken': '',
			}),
			token = new Token(value, config, accum);
		keyToken.type = 'parameter-key';
		keyToken.setAttribute('stage', 2);
		token.type = 'parameter-value';
		token.setAttribute('stage', 2);
		this.append(keyToken, token);

		/* NOT FOR BROWSER */

		if (typeof key === 'string') {
			this.trimName(removeCommentLine(key));
		}
	}

	/** @private */
	trimName(name: string | Token, set = true): string {
		const trimmed = (typeof name === 'string' ? name : name.toString(true))
			.replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');
		if (set) {
			this.setAttribute('name', trimmed);
		}
		return trimmed;
	}

	/** @private */
	override afterBuild(): void {
		if (!this.anon) {
			const {parentNode, firstChild} = this,
				name = this.trimName(firstChild);
			if (parentNode) {
				parentNode.getArgs(name, false, false).add(this);

				/* NOT FOR BROWSER */

				parentNode.getAttribute('keys').add(name);
			}
		}
		super.afterBuild();

		/* NOT FOR BROWSER */

		const /** @implements */ parameterListener: AstListener = ({prevTarget}, data) => {
			if (!this.anon) { // 匿名参数不管怎么变动还是匿名
				const {firstChild, name} = this;
				if (prevTarget === firstChild) {
					const newKey = this.trimName(firstChild);
					data.oldKey = name;
					data.newKey = newKey;
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], parameterListener);
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

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [Token, Token],
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ParameterToken(this.anon ? Number(this.name) : undefined, undefined, config);
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			if (this.anon) {
				token.setAttribute('name', this.name);
			}
			return token;
		});
	}

	override safeReplaceWith(token: this): void {
		Parser.warn(`${this.constructor.name}.safeReplaceWith regress to AstNode.replaceWith.`);
		this.replaceWith(token);
	}

	/**
	 * Get the parameter value
	 *
	 * 获取参数值
	 */
	getValue(): string {
		const value = removeCommentLine(this.lastChild.text());
		return this.anon && this.parentNode?.isTemplate() !== false ? value : value.trim();
	}

	/**
	 * Set the parameter value
	 *
	 * 设置参数值
	 * @param value parameter value / 参数值
	 */
	setValue(value: string): void {
		const {childNodes} = Parser
			.parse(value, this.getAttribute('include'), undefined, this.getAttribute('config'));
		this.lastChild.safeReplaceChildren(childNodes);
	}

	/**
	 * Rename the parameter
	 *
	 * 修改参数名
	 * @param key new parameter name / 新参数名
	 * @param force whether to rename regardless of conflicts / 是否无视冲突命名
	 * @throws `Error` 仅用于模板参数
	 * @throws `RangeError` 更名造成重复参数
	 */
	rename(key: string, force?: boolean): void {
		const {parentNode, anon} = this;
		// 必须检测是否是TranscludeToken
		if (parentNode?.isTemplate() === false) {
			throw new Error('ParameterToken.rename method is only for template parameters!');
		} else if (anon) {
			parentNode?.anonToNamed();
		}
		const root = Parser
				.parse(key, this.getAttribute('include'), undefined, this.getAttribute('config')),
			name = this.trimName(root, false);
		if (this.name === name) {
			Parser.warn('The actual parameter name is not changed', name);
		} else if (parentNode?.hasArg(name)) {
			if (force) {
				Parser.warn('Parameter renaming causes duplicated parameters', name);
			} else {
				throw new RangeError(`Parameter renaming causes duplicated parameters: ${name}`);
			}
		}
		this.firstChild.safeReplaceChildren(root.childNodes);
	}
}

classes['ParameterToken'] = __filename;
