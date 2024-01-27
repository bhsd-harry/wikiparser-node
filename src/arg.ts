import {text} from '../util/string';
import {generateForSelf, generateForChild} from '../util/lint';
import {classes} from '../util/constants';
import {Shadow} from '../util/debug';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {LintError} from '../base';

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
export abstract class ArgToken extends Token {
	override readonly type = 'arg';
	declare readonly name: string;

	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token, ...HiddenToken[]];
	abstract override get children(): [AtomToken] | [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastChild(): Token;
	abstract override get lastElementChild(): Token;

	/** 预设值 */
	get default(): string | false {
		return this.childNodes[1]?.text() ?? false;
	}

	/* NOT FOR BROWSER */

	set default(value) {
		this.setDefault(value);
	}

	/* NOT FOR BROWSER END */

	/** @param parts 以'|'分隔的各部分 */
	constructor(parts: readonly string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
			AtomToken: 0, Token: 1, HiddenToken: '2:',
		});
		for (let i = 0; i < parts.length; i++) {
			if (i === 0) {
				const token = new AtomToken(parts[i], 'arg-name', config, accum, {
					'Stage-2': ':', '!HeadingToken': '',
				});
				super.insertAt(token);
			} else if (i > 1) {
				const token = new HiddenToken(parts[i], config, accum, {
					'Stage-2': ':', '!HeadingToken': '',
				});
				super.insertAt(token);
			} else {
				const token = new Token(parts[i], config, accum);
				token.type = 'arg-default';
				token.setAttribute('stage', 2);
				super.insertAt(token);
			}
		}

		/* NOT FOR BROWSER */

		this.protectChildren(0);
	}

	/** @private */
	override toString(): string {
		return `{{{${super.toString('|')}}}}`;
	}

	/** @override */
	override text(): string {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 3 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		if (!this.getAttribute('include')) {
			return [generateForSelf(this, {start}, 'unexpected template argument')];
		}
		const {childNodes: [argName, argDefault, ...rest]} = this,
			errors = argName.lint(start + 3);
		if (argDefault) {
			errors.push(...argDefault.lint(start + 4 + String(argName).length));
		}
		if (rest.length > 0) {
			const rect: BoundingRect = {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(...rest.map(child => {
				const error = generateForChild(child, rect, 'invisible content inside triple braces');
				return {
					...error,
					startIndex: error.startIndex - 1,
					startCol: error.startCol - 1,
				};
			}));
		}
		return errors;
	}

	/** @override */
	override print(): string {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/** @override */
	override json(): object {
		return {
			...super.json(),
			default: this.default,
		};
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [name, ...cloned] = this.cloneChildNodes() as [AtomToken, ...Token[]];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ArgToken([''], this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(name);
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/** 设置name */
	#setName(): void {
		this.setAttribute('name', this.firstChild.text().trim());
	}

	/** @private */
	override afterBuild(): void {
		this.#setName();
		const /** @implements */ argListener: AstListener = ({prevTarget}) => {
			if (prevTarget === this.firstChild) {
				this.#setName();
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], argListener);
	}

	/** 移除无效部分 */
	removeRedundant(): void {
		Shadow.run(() => {
			for (let i = this.length - 1; i > 1; i--) {
				super.removeAt(i);
			}
		});
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	override removeAt(i: number): Token {
		if (i === 1) {
			this.removeRedundant();
		}
		return super.removeAt(i) as Token;
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		i += i < 0 ? this.length : 0;
		if (i > 1) {
			this.constructorError('不可插入多余的子节点');
		} else if (typeof token === 'string') {
			this.constructorError('不可插入文本节点');
		}
		super.insertAt(token, i);
		if (i === 1) {
			token.type = 'arg-default';
		}
		return token;
	}

	/**
	 * 设置参数名
	 * @param name 新参数名
	 */
	setName(name: string): void {
		const {childNodes} = Parser.parse(name, this.getAttribute('include'), 2, this.getAttribute('config'));
		this.firstChild.replaceChildren(...childNodes);
	}

	/**
	 * 设置预设值
	 * @param value 预设值
	 */
	setDefault(value: string | false): void {
		if (value === false) {
			this.removeAt(1);
			return;
		}
		const root = Parser.parse(value, this.getAttribute('include'), undefined, this.getAttribute('config')),
			{childNodes: [, oldDefault]} = this;
		if (oldDefault) {
			oldDefault.replaceChildren(...root.childNodes);
		} else {
			root.type = 'arg-default';
			this.insertAt(root);
		}
	}
}

classes['ArgToken'] = __filename;
