import {extUrlChar, extUrlCharFirst} from '../util/string';
import {generateForChild} from '../util/lint';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {fixedToken} from '../mixin/fixed';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';
import type {FixedTokenBase} from '../mixin/fixed';
import type {AtomToken, SyntaxToken, TranscludeToken} from '../internal';

/**
 * 准确获取参数名
 * @param name 预定的参数名
 */
const getName = (name: Token): string => name.toString(new Set(['comment', 'noinclude', 'include']))
	.replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');

/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
export class ParameterToken extends fixedToken(Token) implements FixedTokenBase {
	override readonly type = 'parameter';
	declare readonly name: string;

	declare readonly childNodes: [Token, Token];
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

	set anon(value) {
		if (value) {
			throw new Error('无法将命名参数转换为匿名参数！');
		}
		this.parentNode?.anonToNamed();
	}

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

	set duplicated(value) {
		if (this.duplicated && !value) {
			this.parentNode!.fixDuplication();
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
				parentNode.getAttribute('keys').add(name);
				parentNode.getArgs(name, false, false).add(this);
			}
		}
		const /** @implements */ parameterListener: AstListener = ({prevTarget}, data) => {
			if (!this.anon) { // 匿名参数不管怎么变动还是匿名
				const {firstChild, name} = this;
				if (prevTarget === firstChild) {
					const newKey = getName(firstChild);
					data.oldKey = name;
					data.newKey = newKey;
					this.setAttribute('name', newKey);
				}
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], parameterListener);
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return this.anon
			&& !(omit && this.matchesTypes(omit))
			? this.lastChild.toString(omit)
			: super.toString(omit, '=');
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

	/** @override */
	override json(): object {
		return {
			...super.json(),
			anon: this.anon,
		};
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [key, value] = this.cloneChildNodes() as [Token, Token],
			config = this.getAttribute('config');
		return Shadow.run(() => {
			const token = new ParameterToken(this.anon ? Number(this.name) : undefined, undefined, config) as this;
			token.firstChild.safeReplaceWith(key);
			token.lastChild.safeReplaceWith(value);
			token.afterBuild();
			if (this.anon) {
				token.setAttribute('name', this.name);
			}
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
	 */
	setValue(value: string): void {
		const {childNodes} = Parser.parse(value, this.getAttribute('include'), undefined, this.getAttribute('config'));
		this.lastChild.replaceChildren(...childNodes);
	}

	/**
	 * 修改参数名
	 * @param key 新参数名
	 * @param force 是否无视冲突命名
	 * @throws `Error` 仅用于模板参数
	 * @throws `RangeError` 更名造成重复参数
	 */
	rename(key: string, force = false): void {
		const {parentNode, anon} = this;
		// 必须检测是否是TranscludeToken
		if (parentNode?.isTemplate() === false) {
			throw new Error('rename 方法仅用于模板参数！');
		} else if (anon) {
			parentNode?.anonToNamed();
		}
		const root = Parser.parse(key, this.getAttribute('include'), undefined, this.getAttribute('config')),
			name = getName(root);
		if (this.name === name) {
			Parser.warn('未改变实际参数名', name);
		} else if (parentNode?.hasArg(name)) {
			if (force) {
				Parser.warn('参数更名造成重复参数', name);
			} else {
				throw new RangeError(`参数更名造成重复参数：${name}`);
			}
		}
		this.firstChild.replaceChildren(...root.childNodes);
	}

	/** 转义 `=` */
	escape(): void {
		for (const child of this.lastChild.childNodes) {
			if (child.type === 'text') {
				child.escape();
			}
		}
	}
}

classes['ParameterToken'] = __filename;
