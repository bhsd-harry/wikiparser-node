import {noWrap, extUrlChar, extUrlCharFirst} from '../util/string';
import {generateForChild} from '../util/lint';
import {fixed} from '../mixin/fixed';
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
	abstract override get children(): [Token, Token];
	// @ts-expect-error abstract method
	abstract override get firstChild(): Token;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): Token;
	// @ts-expect-error abstract method
	abstract override get lastChild(): Token;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): Token;
	// @ts-expect-error abstract method
	abstract override get parentNode(): TranscludeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): TranscludeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): this | undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): this | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AtomToken | SyntaxToken | this;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): AtomToken | SyntaxToken | this;

	/** 是否是匿名参数 */
	get anon(): boolean {
		return this.firstChild.length === 0;
	}

	/* NOT FOR BROWSER */

	/** getValue()的getter */
	get value(): string {
		return this.getValue();
	}

	set value(value) {
		this.setValue(value);
	}

	/** 是否是重复参数 */
	get duplicated(): boolean {
		try {
			return Boolean(this.parentNode?.getDuplicatedArgs().some(([key]) => key === this.name));
		} catch {
			return false;
		}
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param key 参数名
	 * @param value 参数值
	 */
	constructor(key?: string | number, value?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum);
		const keyToken = new Token(typeof key === 'number' ? undefined : key, config, accum, {
				'Stage-11': ':', '!HeadingToken': '',
			}),
			token = new Token(value, config, accum);
		keyToken.type = 'parameter-key';
		token.type = 'parameter-value';
		this.append(keyToken, token.setAttribute('stage', 2));
	}

	/** @private */
	override afterBuild(): void {
		const omit = new Set(['comment', 'noinclude', 'include']);
		if (!this.anon) {
			const name = this.firstChild.toString(omit).replace(/^[ \t\n\0\v]+|(?<=[^ \t\n\0\v])[ \t\n\0\v]+$/gu, ''),
				{parentNode} = this;
			this.setAttribute('name', name);
			if (parentNode) {
				parentNode.getAttribute('keys').add(name);
				parentNode.getArgs(name, false, false).add(this);
			}
		}
		const /** @implements */ parameterListener: AstListener = ({prevTarget}, data) => {
			if (!this.anon) { // 匿名参数不管怎么变动还是匿名
				const {firstChild, name} = this;
				if (prevTarget === firstChild) {
					const newKey = firstChild.toString(omit)
						.replace(/^[ \t\n\0\v]+|(?<=[^ \t\n\0\v])[ \t\n\0\v]+$/gu, '');
					data.oldKey = name;
					data.newKey = newKey;
					this.setAttribute('name', newKey);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], parameterListener);
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
				excerpt: `${String(firstChild).slice(-25)}=${String(lastChild).slice(0, 25)}`,
			});
		}
		return errors;
	}

	/** @override */
	override print(): string {
		return super.print({sep: this.anon ? '' : '='});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [Token, Token],
			config = this.getAttribute('config');
		return Parser.run(() => {
			const token = new ParameterToken(this.anon ? Number(this.name) : undefined, undefined, config) as this;
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			token.afterBuild();
			return token;
		});
	}

	/**
	 * @override
	 * @param token 待替换的节点
	 */
	override safeReplaceWith(token: this): void {
		Parser.warn(`${this.constructor.name}.safeReplaceWith 方法退化到 replaceWith。`);
		this.replaceWith(token);
	}

	/** 获取参数值 */
	getValue(): string {
		const value = this.lastChild.text();
		return this.anon && this.parentNode?.isTemplate() !== false ? value : value.trim();
	}

	/**
	 * 设置参数值
	 * @param value 参数值
	 * @throws `SyntaxError` 非法的模板参数
	 */
	setValue(value: string): void {
		const templateLike = this.parentNode?.isTemplate() !== false,
			wikitext = `{{${templateLike ? ':T|' : 'lc:'}${this.anon ? '' : '1='}${value}}}`,
			root = Parser.parse(wikitext, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: transclude} = root;
		if (length !== 1 || transclude!.type !== (templateLike ? 'template' : 'magic-word')) {
			throw new SyntaxError(`非法的模板参数：${noWrap(value)}`);
		}
		const {lastChild: parameter, name} = transclude as Token & {lastChild: ParameterToken},
			targetName = templateLike ? 'T' : 'lc';
		if (name !== targetName || transclude!.length !== 2 || parameter.anon !== this.anon || parameter.name !== '1') {
			throw new SyntaxError(`非法的模板参数：${noWrap(value)}`);
		}
		const {lastChild} = parameter;
		parameter.destroy();
		this.lastChild.safeReplaceWith(lastChild);
	}

	/**
	 * 修改参数名
	 * @param key 新参数名
	 * @param force 是否无视冲突命名
	 * @throws `Error` 仅用于模板参数
	 * @throws `SyntaxError` 非法的模板参数名
	 * @throws `RangeError` 更名造成重复参数
	 */
	rename(key: string, force = false): void {
		const {parentNode} = this;
		// 必须检测是否是TranscludeToken
		if (parentNode?.isTemplate() === false) {
			throw new Error(`${this.constructor.name}.rename 方法仅用于模板参数！`);
		}
		const root = Parser.parse(`{{:T|${key}=}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: template} = root;
		if (length !== 1 || template!.type !== 'template' || template!.name !== 'T' || template!.length !== 2) {
			throw new SyntaxError(`非法的模板参数名：${key}`);
		}
		const {lastChild: parameter} = template as TranscludeToken & {lastChild: ParameterToken},
			{name, firstChild} = parameter;
		if (this.name === name) {
			Parser.warn('未改变实际参数名', name);
		} else if (parentNode?.hasArg(name)) {
			if (force) {
				Parser.warn('参数更名造成重复参数', name);
			} else {
				throw new RangeError(`参数更名造成重复参数：${name}`);
			}
		}
		parameter.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}
}

Parser.classes['ParameterToken'] = __filename;
