import {text, noWrap} from '../util/string';
import {generateForSelf, generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from '.';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {LintError} from '../index';

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
export abstract class ArgToken extends Token {
	/** @browser */
	override readonly type = 'arg';
	declare name: string;
	declare childNodes: [AtomToken] | [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastChild(): Token;
	abstract override get lastElementChild(): Token;

	/**
	 * 预设值
	 * @browser
	 */
	get default(): string | false {
		return this.childNodes[1]?.text() ?? false;
	}

	/**
	 * @browser
	 * @param parts 以'|'分隔的各部分
	 */
	constructor(parts: string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum, {
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
				const token = new Token(parts[i], config, true, accum);
				token.type = 'arg-default';
				super.insertAt(token.setAttribute('stage', 2));
			}
		}
		this.protectChildren(0);
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		return selector && this.matches(selector) ? '' : `{{{${super.toString(selector, '|')}}}}`;
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
	}

	/** @private */
	protected override getPadding(): number {
		return 3;
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i < this.length - 1 ? 1 : 0;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/**
	 * @override
	 * @browser
	 */
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
			const rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(...rest.map(child => {
				const error = generateForChild(child, rect, 'invisible content inside triple braces'),
					{startIndex, startCol, excerpt} = error;
				return {...error, startIndex: startIndex - 1, startCol: startCol - 1, excerpt: `|${excerpt}`};
			}));
		}
		return errors;
	}

	/** @override */
	override cloneNode(): this {
		const [name, ...cloned] = this.cloneChildNodes() as [AtomToken, ...Token[]];
		return Parser.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ArgToken([''], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(name);
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/** @private */
	protected override afterBuild(): void {
		this.setAttribute('name', this.firstChild.text().trim());
		const /** @implements */ argListener: AstListener = ({prevTarget}) => {
			if (prevTarget === this.firstChild) {
				this.setAttribute('name', prevTarget.text().trim());
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], argListener);
	}

	/** 移除无效部分 */
	removeRedundant(): void {
		Parser.run(() => {
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
	 * @throws `RangeError` 不可插入多余子节点
	 * @throws `TypeError` 不可插入文本节点
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		const j = i < 0 ? i + this.length : i;
		if (j > 1) {
			throw new RangeError(`${this.constructor.name}不可插入多余的子节点！`);
		} else if (typeof token === 'string') {
			throw new TypeError(`${this.constructor.name}不可插入文本节点！`);
		}
		super.insertAt(token, i);
		if (j === 1) {
			token.type = 'arg-default';
		}
		return token;
	}

	/**
	 * 设置参数名
	 * @param name 新参数名
	 * @throws `SyntaxError` 非法的参数名
	 */
	setName(name: string): void {
		const root = Parser.parse(`{{{${name}}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: arg} = root;
		if (length !== 1 || !(arg instanceof ArgToken) || arg.length !== 1) {
			throw new SyntaxError(`非法的参数名称：${noWrap(name)}`);
		}
		const {firstChild} = arg;
		arg.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置预设值
	 * @param value 预设值
	 * @throws `SyntaxError` 非法的参数预设值
	 */
	setDefault(value: string): void {
		const root = Parser.parse(`{{{|${value}}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: arg} = root;
		if (length !== 1 || !(arg instanceof ArgToken) || arg.length !== 2) {
			throw new SyntaxError(`非法的参数预设值：${noWrap(value)}`);
		}
		const {childNodes: [, oldDefault]} = this,
			{lastChild} = arg;
		arg.destroy();
		if (oldDefault) {
			oldDefault.safeReplaceWith(lastChild);
		} else {
			this.insertAt(lastChild);
		}
	}
}

Parser.classes['ArgToken'] = __filename;
