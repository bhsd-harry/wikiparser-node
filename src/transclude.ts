import {removeComment, text, noWrap, decodeHtml} from '../util/string';
import {generateForChild} from '../util/lint';
import * as Parser from '../index';
import {Token} from './index';
import {ParameterToken} from './parameter';
import {AtomToken} from './atom';
import {SyntaxToken} from './syntax';
import type {LintError} from '../index';

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...AtomToken, ...ParameterToken]}`
 */
export class TranscludeToken extends Token {
	/** @browser */
	override type: 'template' | 'magic-word' = 'template';
	/** @browser */
	modifier = '';
	/** @browser */
	#fragment: string | undefined;
	/** @browser */
	#valid = true;
	/** @browser */
	#raw = false;
	#args = new Map<string, Set<ParameterToken>>();

	declare childNodes: [AtomToken | SyntaxToken, ...ParameterToken[]]
		| [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken | SyntaxToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken | SyntaxToken | ParameterToken;

	/**
	 * @browser
	 * @param title 模板标题或魔术字
	 * @param parts 参数各部分
	 * @throws `SyntaxError` 非法的模板名称
	 */
	constructor(
		title: string,
		parts: ([string] | [string | number, string])[],
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(undefined, config, accum, {
		});
		const {parserFunction: [insensitive, sensitive]} = config,
			argSubst = /^(?:\s|\0\d+c\x7F)*\0\d+s\x7F/u.exec(title)?.[0];
		if (argSubst) {
			this.setAttribute('modifier', argSubst);
			title = title.slice(argSubst.length);
		} else if (title.includes(':')) {
			const [modifier, ...arg] = title.split(':'),
				[mt] = /^(?:\s|\0\d+c\x7F)*/u.exec(arg[0] ?? '')!;
			if (this.setModifier(`${modifier!}:${mt}`)) {
				title = arg.join(':').slice(mt.length);
			}
		}
		if (title.includes(':') || parts.length === 0 && !this.#raw) {
			const [magicWord, ...arg] = title.split(':'),
				cleaned = removeComment(magicWord!),
				name = cleaned[arg.length > 0 ? 'trimStart' : 'trim'](),
				isSensitive = sensitive.includes(name),
				canonicalCame = insensitive[name.toLowerCase()];
			if (isSensitive || canonicalCame) {
				this.setAttribute('name', canonicalCame ?? name.toLowerCase()).type = 'magic-word';
				const pattern = new RegExp(`^\\s*${name}\\s*$`, isSensitive ? 'u' : 'iu'),
					token = new SyntaxToken(magicWord, pattern, 'magic-word-name', config, accum, {
					});
				super.insertAt(token);
				if (arg.length > 0) {
					parts.unshift([arg.join(':')]);
				}
				if (this.name === 'invoke') {
					for (let i = 0; i < 2; i++) {
						const part = parts.shift();
						if (!part) {
							break;
						}
						const invoke = new AtomToken(
							part.join('='),
							`invoke-${i ? 'function' : 'module'}`,
							config,
							accum,
						);
						super.insertAt(invoke);
					}
				}
			}
		}
		if (this.type === 'template') {
			const name = removeComment(decodeHtml(title)).split('#')[0]!.trim();
			if (!name || /\0\d+[eh!+-]\x7F|[<>[\]{}\n]|%[\da-f]{2}/u.test(name)) {
				accum.pop();
				throw new SyntaxError(`非法的模板名称：${noWrap(name)}`);
			}
			const token = new AtomToken(title, 'template-name', config, accum, {
			});
			super.insertAt(token);
		}
		const templateLike = this.isTemplate();
		let i = 1;
		for (let j = 0; j < parts.length; j++) {
			const part = parts[j]!;
			if (!templateLike && !(this.name === 'switch' && j > 0)) {
				part[0] = part.join('=');
				part.length = 1;
			}
			if (part.length === 1) {
				(part as (number | string)[]).unshift(i);
				i++;
			}
			this.insertAt(new ParameterToken(...part as [string | number, string], config, accum));
		}
	}

	/**
	 * 设置引用修饰符
	 * @browser
	 * @param modifier 引用修饰符
	 */
	setModifier(modifier: string): boolean {
		const {parserFunction: [,, raw, subst]} = this.getAttribute('config'),
			lcModifier = removeComment(modifier).trim();
		if (modifier && !lcModifier.endsWith(':')) {
			return false;
		}
		const magicWord = lcModifier.slice(0, -1).toLowerCase(),
			isRaw = raw.includes(magicWord),
			isSubst = subst.includes(magicWord);
		if (this.#raw && isRaw || !this.#raw && (isSubst || modifier === '')
			|| this.length > 1 && (isRaw || isSubst || modifier === '')
		) {
			this.setAttribute('modifier', modifier);
			this.#raw = isRaw;
			return Boolean(modifier);
		}
		return false;
	}

	/**
	 * 是否是模板
	 * @browser
	 */
	isTemplate(): boolean {
		return this.type === 'template' || this.name === 'invoke';
	}

	/** @private */
	override afterBuild(): void {
		if (this.modifier.includes('\0')) {
			this.setAttribute('modifier', this.buildFromStr(this.modifier, 'string'));
		}
		if (this.isTemplate()) {
			const isTemplate = this.type === 'template',
				titleObj = this.normalizeTitle(this.childNodes[isTemplate ? 0 : 1]!.text(), isTemplate ? 10 : 828);
			this.#fragment = titleObj.fragment;
			this.#valid = titleObj.valid;
		}
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return `{{${this.modifier}${
			this.type === 'magic-word'
				? `${this.firstChild.toString(omit)}${this.length === 1 ? '' : ':'}${
					this.childNodes.slice(1).map(child => child.toString(omit)).join('|')
				}`
				: super.toString(omit, '|')
		}}}`;
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		const {childNodes, length, firstChild, modifier, type, name} = this;
		return type === 'magic-word' && name === 'vardefine'
			? ''
			: `{{${modifier}${
				type === 'magic-word'
					? `${firstChild.text()}${length === 1 ? '' : ':'}${text(childNodes.slice(1), '|')}`
					: super.text('|')
			}}}`;
	}

	/** @private */
	protected override getPadding(): number {
		return this.modifier.length + 2;
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i < this.length - 1 ? 1 : 0;
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{type, childNodes} = this;
		let rect: BoundingRect | undefined;
		if (!this.isTemplate()) {
			return errors;
		} else if (this.#fragment !== undefined) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(childNodes[type === 'template' ? 0 : 1]!, rect, 'useless fragment'));
		}
		if (!this.#valid) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(childNodes[1]!, rect, 'illegal module name'));
		}
		const duplicatedArgs = this.getDuplicatedArgs();
		if (duplicatedArgs.length > 0) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(...duplicatedArgs.flatMap(([, args]) => args).map(
				arg => generateForChild(arg, rect!, 'duplicated parameter'),
			));
		}
		return errors;
	}

	/**
	 * 处理匿名参数更改
	 * @browser
	 * @param addedToken 新增的参数
	 */
	#handleAnonArgChange(addedToken: number | ParameterToken): void {
		const args = this.getAnonArgs(),
			added = typeof addedToken !== 'number';
		for (let i = added ? args.indexOf(addedToken) : addedToken - 1; i < args.length; i++) {
			const token = args[i]!,
				{name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				this.getArgs(newName, false, false).add(token.setAttribute('name', newName));
			}
		}
	}

	/**
	 * @override
	 * @browser
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	override insertAt<T extends ParameterToken>(token: T, i = this.length): T {
		super.insertAt(token, i);
		if (token.anon) {
			this.#handleAnonArgChange(token);
		} else if (token.name) {
			this.getArgs(token.name, false, false).add(token);
		}
		return token;
	}

	/**
	 * 获取所有参数
	 * @browser
	 */
	getAllArgs(): ParameterToken[] {
		return this.childNodes.filter(child => child.type === 'parameter') as ParameterToken[];
	}

	/**
	 * 获取匿名参数
	 * @browser
	 */
	getAnonArgs(): ParameterToken[] {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/**
	 * 获取指定参数
	 * @browser
	 * @param key 参数名
	 * @param exact 是否匹配匿名性
	 * @param copy 是否返回一个备份
	 */
	getArgs(key: string | number, exact = false, copy = true): Set<ParameterToken> {
		const keyStr = String(key).replace(/^[ \t\n\0\v]+|(?<=[^ \t\n\0\v])[ \t\n\0\v]+$/gu, '');
		let args: Set<ParameterToken>;
		if (this.#args.has(keyStr)) {
			args = this.#args.get(keyStr)!;
		} else {
			args = new Set(this.getAllArgs().filter(({name}) => keyStr === name));
			this.#args.set(keyStr, args);
		}
		return args;
	}

	/**
	 * 获取重名参数
	 * @browser
	 * @throws `Error` 仅用于模板
	 */
	getDuplicatedArgs(): [string, ParameterToken[]][] {
		if (this.isTemplate()) {
			return [...this.#args].filter(([, {size}]) => size > 1).map(([key, args]) => [key, [...args]]);
		}
		return [];
	}

	/**
	 * 对特定魔术字获取可能的取值
	 * @browser
	 * @throws `Error` 不是可接受的魔术字
	 */
	getPossibleValues(): Token[] {
		const {type, name, childNodes, constructor: {name: cName}} = this;
		if (type === 'template') {
			throw new Error(`${cName}.getPossibleValues 方法仅供特定魔术字使用！`);
		}
		let start: number;
		switch (name) {
			case 'if':
			case 'ifexist':
			case 'ifexpr':
			case 'iferror':
				start = 2;
				break;
			case 'ifeq':
				start = 3;
				break;
			default:
				throw new Error(`${cName}.getPossibleValues 方法仅供特定魔术字使用！`);
		}
		const queue = (childNodes.slice(start, start + 2) as ParameterToken[]).map(({childNodes: [, value]}) => value);
		for (let i = 0; i < queue.length;) {
			const {length, 0: first} = queue[i]!.childNodes.filter(child => child.text().trim());
			if (length === 0) {
				queue.splice(i, 1);
			} else if (length > 1 || first!.type !== 'magic-word') {
				i++;
			} else {
				try {
					const possibleValues = (first as this).getPossibleValues();
					queue.splice(i, 1, ...possibleValues);
					i += possibleValues.length;
				} catch {
					i++;
				}
			}
		}
		return queue;
	}
}
