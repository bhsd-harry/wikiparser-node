import {text} from '../util/string';
import {generateForSelf, generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import {HiddenToken} from './hidden';
import type {
	LintError,
	AST,
} from '../base';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {Shadow} from '../util/debug';

/* NOT FOR BROWSER END */

/**
 * argument wrapped in `{{{}}}`
 *
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken[]]}`
 */
export abstract class ArgToken extends Token {
	declare readonly name: string;
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, Token, ...HiddenToken[]];
	abstract override get firstElementChild(): AtomToken;
	abstract override get lastElementChild(): Token;

	/* NOT FOR BROWSER END */

	override get type(): 'arg' {
		return 'arg';
	}

	/** default value / 预设值 */
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
		for (const [i, part] of parts.entries()) {
			if (i === 0) {
				const token = new AtomToken(part, 'arg-name', config, accum, {
					'Stage-2': ':', '!HeadingToken': '',
				});
				super.insertAt(token);
			} else if (i > 1) {
				const token = new HiddenToken(part, config, accum);
				super.insertAt(token);
			} else {
				const token = new Token(part, config, accum);
				token.type = 'arg-default';
				token.setAttribute('stage', 2);
				super.insertAt(token);
			}
		}

		/* NOT FOR BROWSER */

		this.protectChildren(0);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `{{{${super.toString(skip, '|')}}}}`;
	}

	/** @private */
	override text(): string {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding' ? 3 as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** 设置name */
	#setName(): void {
		// eslint-disable-next-line no-unused-labels
		LSP: this.setAttribute('name', this.firstChild.toString(true).trim());
	}

	/** @private */
	override afterBuild(): void {
		// eslint-disable-next-line no-unused-labels
		LSP: this.#setName();
		super.afterBuild();

		/* NOT FOR BROWSER */

		const /** @implements */ argListener: AstListener = ({prevTarget}) => {
			if (prevTarget === this.firstChild) {
				this.#setName();
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], argListener);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const {childNodes: [argName, argDefault, ...rest]} = this;
		if (!this.getAttribute('include')) {
			const e = generateForSelf(this, {start}, 'no-arg', 'unexpected template argument');
			if (argDefault) {
				e.suggestions = [{range: [start, e.endIndex], text: argDefault.text(), desc: 'expand'}];
			}
			return [e];
		}
		const errors = argName.lint(start + 3, re);
		if (argDefault) {
			errors.push(...argDefault.lint(start + 4 + argName.toString().length, re));
		}
		if (rest.length > 0) {
			const rect = new BoundingRect(this, start);
			errors.push(...rest.map(child => {
				const e = generateForChild(
					child,
					rect,
					'no-ignored',
					'invisible content inside triple braces',
				);
				e.startIndex--;
				e.startCol--;
				e.suggestions = [
					{desc: 'remove', range: [e.startIndex, e.endIndex], text: ''},
					{desc: 'escape', range: [e.startIndex, e.startIndex + 1], text: '{{!}}'},
				];
				return e;
			}));
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		json['default'] = this.default;
		return json;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [name, ...cloned] = this.cloneChildNodes() as [AtomToken, ...Token[]];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ArgToken([''], this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(name);
			token.append(...cloned);
			return token;
		});
	}

	/**
	 * Remove redundant parts
	 *
	 * 移除无效部分
	 */
	removeRedundant(): void {
		Shadow.run(() => {
			for (let i = this.length - 1; i > 1; i--) {
				super.removeAt(i);
			}
		});
	}

	/**
	 * @override
	 * @param i position of the child node / 移除位置
	 */
	override removeAt(i: number): Token {
		if (i === 1) {
			this.removeRedundant();
		}
		return super.removeAt(i) as Token;
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		i += i < 0 ? this.length : 0;
		if (Shadow.running) {
			//
		} else if (i > 1) {
			this.constructorError('cannot insert redundant child nodes');
		} else if (typeof token === 'string') {
			this.constructorError('cannot insert text nodes');
		}
		super.insertAt(token, i);
		if (i === 1) {
			token.type = 'arg-default';
		}
		return token;
	}

	/**
	 * Set the argument name
	 *
	 * 设置参数名
	 * @param name new argument name / 新参数名
	 */
	setName(name: string): void {
		const {childNodes} = Parser
			.parse(name, this.getAttribute('include'), 2, this.getAttribute('config'));
		this.firstChild.replaceChildren(...childNodes);
	}

	/**
	 * Set the default value
	 *
	 * 设置预设值
	 * @param value default value / 预设值
	 */
	setDefault(value: string | false): void {
		if (value === false) {
			this.removeAt(1);
			return;
		}
		const root = Parser
				.parse(value, this.getAttribute('include'), undefined, this.getAttribute('config')),
			{childNodes: [, oldDefault]} = this;
		if (oldDefault) {
			oldDefault.replaceChildren(...root.childNodes);
		} else {
			root.type = 'arg-default';
			this.insertAt(root);
		}
	}

	/** @private */
	override toHtmlInternal(opt?: HtmlOpt): string {
		if (this.length === 1) {
			const html = this.toString();
			return opt?.nowrap ? html.replaceAll('\n', ' ') : html;
		}
		return this.childNodes[1]!.toHtmlInternal(opt);
	}
}

classes['ArgToken'] = __filename;
