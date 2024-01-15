import {
	removeComment,
	escapeRegExp,
	text,
	noWrap,
	print,
	decodeHtml,
} from '../util/string';
import {generateForChild, generateForSelf} from '../util/lint';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import * as Parser from '../index';
import {Token} from './index';
import {ParameterToken} from './parameter';
import {AtomToken} from './atom';
import {SyntaxToken} from './syntax';
import type {LintError} from '../base';
import type {Title} from '../lib/title';
import type {AstNodes, TableToken} from '../internal';

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...AtomToken, ...ParameterToken]}`
 */
export class TranscludeToken extends Token {
	override type: 'template' | 'magic-word' = 'template';
	declare readonly name: string;
	readonly modifier = '';
	#raw = false;
	readonly #args = new Map<string, Set<ParameterToken>>();

	/* NOT FOR BROWSER */

	readonly #keys = new Set<string>();

	/* NOT FOR BROWSER END */

	declare readonly childNodes: [AtomToken | SyntaxToken, ...ParameterToken[]]
	| [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	// @ts-expect-error abstract method
	abstract override get children(): [AtomToken | SyntaxToken, ...ParameterToken[]]
	| [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken | SyntaxToken;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): AtomToken | SyntaxToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken | SyntaxToken | ParameterToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): AtomToken | SyntaxToken | ParameterToken;

	/* NOT FOR BROWSER */

	/** 是否存在重复参数 */
	get duplication(): boolean {
		return this.isTemplate() && Boolean(this.hasDuplicatedArgs());
	}

	set duplication(duplication) {
		if (this.duplication && !duplication) {
			this.fixDuplication();
		}
	}

	/* NOT FOR BROWSER END */

	/**
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
			AtomToken: 0, SyntaxToken: 0, ParameterToken: '1:',
		});
		this.seal('modifier');
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
		const isFunction = title.includes(':');
		if (isFunction || parts.length === 0 && !this.#raw) {
			const [magicWord, ...arg] = title.split(':'),
				cleaned = removeComment(magicWord!),
				name = cleaned[arg.length > 0 ? 'trimStart' : 'trim'](),
				isSensitive = sensitive.includes(name),
				canonicalCame = isFunction && insensitive[name.toLowerCase()];
			if (isSensitive || canonicalCame) {
				this.setAttribute('name', canonicalCame || name.toLowerCase());
				this.type = 'magic-word';
				const pattern = new RegExp(`^\\s*${name}\\s*$`, isSensitive ? 'u' : 'iu'),
					token = new SyntaxToken(magicWord, pattern, 'magic-word-name', config, accum, {
						'Stage-1': ':', '!ExtToken': '',
					});
				super.insertAt(token);
				if (arg.length > 0) {
					parts.unshift([arg.join(':')]);
				}
				if (this.name === 'invoke') {
					this.setAttribute('acceptable', {SyntaxToken: 0, AtomToken: '1:3', ParameterToken: '3:'});
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
							{'Stage-1': ':', '!ExtToken': ''},
						);
						super.insertAt(invoke);
					}
					this.protectChildren('1:3');
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
				'Stage-2': ':', '!HeadingToken': '',
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
		this.protectChildren(0);
	}

	/**
	 * 设置引用修饰符
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
		if (
			this.#raw && isRaw
				|| !this.#raw && (isSubst || modifier === '')
				|| (Shadow.running || this.length > 1) && (isRaw || isSubst || modifier === '')
		) {
			this.setAttribute('modifier', modifier);
			this.#raw = isRaw;
			return Boolean(modifier);
		}
		return false;
	}

	/** 是否是模板或模块 */
	isTemplate(): boolean {
		return this.type === 'template' || this.name === 'invoke';
	}

	/** 获取模板或模块名 */
	#getTitle(): Title | undefined {
		const isTemplate = this.type === 'template',
			child = this.childNodes[isTemplate ? 0 : 1] as AtomToken | undefined;
		return child && this.normalizeTitle(child.text(), isTemplate ? 10 : 828);
	}

	/** @private */
	override afterBuild(): void {
		if (this.modifier.includes('\0')) {
			this.setAttribute('modifier', this.buildFromStr(this.modifier, 'string'));
		}
		if (this.isTemplate()) {
			const isTemplate = this.type === 'template';
			if (isTemplate || this.length > 1) {
				this.setAttribute(isTemplate ? 'name' : 'module', this.#getTitle()!.title);
			}

			/**
			 * 当事件bubble到`parameter`时，将`oldKey`和`newKey`保存进AstEventData。
			 * 当继续bubble到`template`时，处理并删除`oldKey`和`newKey`。
			 * @implements
			 */
			const transcludeListener: AstListener = (e, data) => {
				const {prevTarget} = e,
					{oldKey, newKey} = data;
				if (typeof oldKey === 'string') {
					delete data.oldKey;
					delete data.newKey;
				}
				if (
					prevTarget === this.firstChild && isTemplate
					|| prevTarget === this.childNodes[1]! && !isTemplate && this.name === 'invoke'
				) {
					this.setAttribute(isTemplate ? 'name' : 'module', this.#getTitle()!.title);
				} else if (oldKey !== newKey && prevTarget instanceof ParameterToken) {
					const oldArgs = this.getArgs(oldKey!, false, false);
					oldArgs.delete(prevTarget);
					this.getArgs(newKey!, false, false).add(prevTarget);
					this.#keys.add(newKey!);
					if (oldArgs.size === 0) {
						this.#keys.delete(oldKey!);
					}
				}
			};
			this.addEventListener(['remove', 'insert', 'replace', 'text'], transcludeListener);
		}
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		if (omit && this.matchesTypes(omit)) {
			return '';
		}
		return `{{${this.modifier}${
			this.type === 'magic-word'
				? `${this.firstChild.toString(omit)}${this.length === 1 ? '' : ':'}${
					this.childNodes.slice(1).map(child => child.toString(omit)).join('|')
				}`
				: super.toString(omit, '|')
		}}}`;
	}

	/** @override */
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
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		switch (key) {
			case 'padding':
				return this.modifier.length + 2 as TokenAttributeGetter<T>;
			case 'args':
				return new Map(this.#args) as TokenAttributeGetter<T>;
			case 'keys':
				return this.#keys as TokenAttributeGetter<T>;
			default:
				return super.getAttribute(key);
		}
	}

	/** @private */
	protected override getGaps(): number {
		return 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{type, childNodes, length} = this;
		let rect: BoundingRect | undefined;
		if (!this.isTemplate()) {
			return errors;
		}
		const title = this.#getTitle();
		if (!title) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForSelf(this, rect, 'missing module name'));
			return errors;
		} else if (title.fragment !== undefined) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(childNodes[type === 'template' ? 0 : 1]!, rect, 'useless fragment'));
		}
		if (!title.valid) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(childNodes[1]!, rect, 'illegal module name'));
		}
		if (type === 'magic-word' && length === 2) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForSelf(this, rect, 'missing module function'));
			return errors;
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
	 * @param addedToken 新增的参数
	 */
	#handleAnonArgChange(addedToken: number | ParameterToken): void {
		const args = this.getAnonArgs(),
			added = typeof addedToken !== 'number';
		const maxAnon = String(args.length + (added ? 0 : 1));
		if (added) {
			this.#keys.add(maxAnon);
		} else if (!this.hasArg(maxAnon, true)) {
			this.#keys.delete(maxAnon);
		}
		for (let i = added ? args.indexOf(addedToken) : addedToken - 1; i < args.length; i++) {
			const token = args[i]!,
				{name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				token.setAttribute('name', newName);
				this.getArgs(newName, false, false).add(token);
				if (name) {
					this.getArgs(name, false, false).delete(token);
				}
			}
		}
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	override insertAt<T extends ParameterToken>(token: T, i = this.length): T {
		super.insertAt(token, i);
		if (token.anon) {
			this.#handleAnonArgChange(token);
		} else if (token.name) {
			this.getArgs(token.name, false, false).add(token);
			this.#keys.add(token.name);
		}
		return token;
	}

	/** 获取所有参数 */
	getAllArgs(): readonly ParameterToken[] {
		return this.childNodes.filter((child): child is ParameterToken => child.type === 'parameter');
	}

	/** 获取所有匿名参数 */
	getAnonArgs(): readonly ParameterToken[] {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/**
	 * 获取指定参数
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
		if (exact && !Number.isNaN(Number(keyStr))) {
			args = new Set([...args].filter(({anon}) => typeof key === 'number' === anon));
		} else if (copy) {
			args = new Set(args);
		}
		return args;
	}

	/**
	 * 获取重名参数
	 * @throws `Error` 仅用于模板
	 */
	getDuplicatedArgs(): readonly [string, ParameterToken[]][] {
		if (this.isTemplate()) {
			return [...this.#args].filter(([, {size}]) => size > 1).map(([key, args]) => [key, [...args]]);
		}
		throw new Error(`${this.constructor.name}.getDuplicatedArgs 方法仅供模板使用！`);
	}

	/**
	 * 对特定魔术字获取可能的取值
	 * @throws `Error` 不是可接受的魔术字
	 */
	getPossibleValues(): readonly Token[] {
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

	/** @override */
	override print(): string {
		const {childNodes, length, firstChild, modifier, type} = this;
		return `<span class="wpb-${type}">{{${modifier}${
			type === 'magic-word'
				? `${firstChild.print()}${length === 1 ? '' : ':'}${print(childNodes.slice(1), {sep: '|'})}`
				: print(childNodes, {sep: '|'})
		}}}</span>`;
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [first, ...cloned] = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			const token = new TranscludeToken(this.type === 'template' ? 'T' : first!.text(), [], config) as this;
			if (this.#raw) {
				token.setModifier(this.modifier);
			} else {
				token.setAttribute('modifier', this.modifier);
			}
			token.firstChild.safeReplaceWith(first as never);
			token.afterBuild();
			token.append(...cloned);
			return token;
		});
	}

	/** 替换引用 */
	subst(): void {
		this.setModifier('subst:');
	}

	/** 安全的替换引用 */
	safesubst(): void {
		this.setModifier('safesubst:');
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	override removeAt(i: number): ParameterToken {
		const token = super.removeAt(i) as ParameterToken;
		if (token.anon) {
			this.#handleAnonArgChange(Number(token.name));
		} else {
			const args = this.getArgs(token.name, false, false);
			args.delete(token);
			if (args.size === 0) {
				this.#keys.delete(token.name);
			}
		}
		return token;
	}

	/**
	 * 是否具有某参数
	 * @param key 参数名
	 * @param exact 是否匹配匿名性
	 */
	hasArg(key: string | number, exact = false): boolean {
		return this.getArgs(key, exact, false).size > 0;
	}

	/**
	 * 获取生效的指定参数
	 * @param key 参数名
	 * @param exact 是否匹配匿名性
	 */
	getArg(key: string | number, exact = false): ParameterToken | undefined {
		return [...this.getArgs(key, exact, false)].sort((a, b) => a.compareDocumentPosition(b)).at(-1);
	}

	/**
	 * 移除指定参数
	 * @param key 参数名
	 * @param exact 是否匹配匿名性
	 */
	removeArg(key: string | number, exact = false): void {
		Shadow.run(() => {
			for (const token of this.getArgs(key, exact, false)) {
				this.removeChild(token);
			}
		});
	}

	/** 获取所有参数名 */
	getKeys(): readonly string[] {
		const args = this.getAllArgs();
		if (this.#keys.size === 0 && args.length > 0) {
			for (const {name} of args) {
				this.#keys.add(name);
			}
		}
		return [...this.#keys];
	}

	/**
	 * 获取参数值
	 * @param key 参数名
	 */
	getValues(key: string | number): readonly string[] {
		return [...this.getArgs(key, false, false)].map(token => token.getValue());
	}

	/** 获取所有生效的参数值 */
	getValue(): Record<string, string>;

	/**
	 * 获取生效的指定参数值
	 * @param key 参数名
	 */
	getValue(key: string | number): string | undefined;

	/**
	 * 获取生效的参数值
	 * @param key 参数名
	 */
	getValue(key?: string | number): Record<string, string> | string | undefined {
		return key === undefined
			? Object.fromEntries(this.getKeys().map(k => [k, this.getValue(k)!]))
			: this.getArg(key)?.getValue();
	}

	/**
	 * 插入匿名参数
	 * @param val 参数值
	 */
	newAnonArg(val: string): ParameterToken {
		const config = this.getAttribute('config'),
			{childNodes} = Parser.parse(val, this.getAttribute('include'), undefined, config),
			token = Shadow.run(() => new ParameterToken(undefined, undefined, config));
		token.lastChild.append(...childNodes);
		token.afterBuild();
		return this.insertAt(token);
	}

	/**
	 * 设置参数值
	 * @param key 参数名
	 * @param value 参数值
	 * @throws `Error` 仅用于模板
	 */
	setValue(key: string, value: string): void {
		if (!this.isTemplate()) {
			throw new Error(`${this.constructor.name}.setValue 方法仅供模板使用！`);
		}
		const arg = this.getArg(key);
		if (arg) {
			arg.setValue(value);
			return;
		}
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			k = Parser.parse(key, include, undefined, config),
			v = Parser.parse(value, include, undefined, config),
			token = Shadow.run(() => new ParameterToken(undefined, undefined, config));
		token.firstChild.append(...k.childNodes);
		token.lastChild.append(...v.childNodes);
		token.afterBuild();
		this.insertAt(token);
	}

	/**
	 * 将匿名参数改写为命名参数
	 * @throws `Error` 仅用于模板
	 */
	anonToNamed(): void {
		if (!this.isTemplate()) {
			throw new Error(`${this.constructor.name}.anonToNamed 方法仅供模板使用！`);
		}
		for (const token of this.getAnonArgs()) {
			token.firstChild.replaceChildren(token.name);
		}
	}

	/**
	 * 替换模板名
	 * @param title 模板名
	 * @throws `Error` 仅用于模板
	 */
	replaceTemplate(title: string): void {
		if (this.type === 'magic-word') {
			throw new Error(`${this.constructor.name}.replaceTemplate 方法仅用于更换模板！`);
		}
		const {childNodes} = Parser.parse(title, this.getAttribute('include'), 2, this.getAttribute('config'));
		(this.firstChild as AtomToken).replaceChildren(...childNodes);
	}

	/**
	 * 替换模块名
	 * @param title 模块名
	 * @throws `Error` 仅用于模块
	 */
	replaceModule(title: string): void {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error(`${this.constructor.name}.replaceModule 方法仅用于更换模块！`);
		}
		const config = this.getAttribute('config');
		if (this.length === 1) {
			super.insertAt(new AtomToken(undefined, 'invoke-module', config, [], {
				'Stage-1': ':', '!ExtToken': '',
			}));
			return;
		}
		const {childNodes} = Parser.parse(title, this.getAttribute('include'), 2, config);
		(this.childNodes[1] as AtomToken).replaceChildren(...childNodes);
	}

	/**
	 * 替换模块函数
	 * @param func 模块函数名
	 * @throws `Error` 仅用于模块
	 * @throws `Error` 尚未指定模块名称
	 */
	replaceFunction(func: string): void {
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error(`${this.constructor.name}.replaceModule 方法仅用于更换模块！`);
		} else if (this.length < 2) {
			throw new Error('尚未指定模块名称！');
		}
		const config = this.getAttribute('config');
		if (this.length === 2) {
			super.insertAt(new AtomToken(undefined, 'invoke-function', config, [], {
				'Stage-1': ':', '!ExtToken': '',
			}));
			return;
		}
		const {childNodes} = Parser.parse(func, this.getAttribute('include'), 2, config);
		(this.childNodes[2] as AtomToken).replaceChildren(...childNodes);
	}

	/**
	 * 重复参数计数
	 * @throws `Error` 仅用于模板
	 */
	hasDuplicatedArgs(): number {
		if (this.isTemplate()) {
			return this.getAllArgs().length - this.getKeys().length;
		}
		throw new Error(`${this.constructor.name}.hasDuplicatedArgs 方法仅供模板使用！`);
	}

	/**
	 * 修复重名参数：
	 * `aggressive = false`时只移除空参数和全同参数，优先保留匿名参数，否则将所有匿名参数更改为命名。
	 * `aggressive = true`时还会尝试处理连续的以数字编号的参数。
	 * @param aggressive 是否使用有更大风险的修复手段
	 */
	fixDuplication(aggressive = false): readonly string[] {
		if (!this.hasDuplicatedArgs()) {
			return [];
		}
		const duplicatedKeys: string[] = [];
		let {length: anonCount} = this.getAnonArgs();
		for (const [key, args] of this.getDuplicatedArgs()) {
			if (args.length <= 1) {
				continue;
			}
			const values = new Map<string, ParameterToken[]>();
			for (const arg of args) {
				const val = arg.getValue().trim();
				if (values.has(val)) {
					values.get(val)!.push(arg);
				} else {
					values.set(val, [arg]);
				}
			}
			let noMoreAnon = anonCount === 0 || Number.isNaN(Number(key));
			const emptyArgs = values.get('') ?? [],
				duplicatedArgs = [...values].filter(([val, {length}]) => val && length > 1).flatMap(([, curArgs]) => {
					const anonIndex = noMoreAnon ? -1 : curArgs.findIndex(({anon}) => anon);
					if (anonIndex !== -1) {
						noMoreAnon = true;
					}
					curArgs.splice(anonIndex, 1);
					return curArgs;
				}),
				badArgs = [...emptyArgs, ...duplicatedArgs],
				index = noMoreAnon ? -1 : emptyArgs.findIndex(({anon}) => anon);
			if (badArgs.length === args.length) {
				badArgs.splice(index, 1);
			} else if (index !== -1) {
				this.anonToNamed();
				anonCount = 0;
			}
			for (const arg of badArgs) {
				arg.remove();
			}
			let remaining = args.length - badArgs.length;
			if (remaining === 1) {
				continue;
			} else if (aggressive && (anonCount ? /\D\d+$/u : /(?:^|\D)\d+$/u).test(key)) {
				let last: number;
				const str = key.slice(0, -/(?<!\d)\d+$/u.exec(key)![0]!.length),
					regex = new RegExp(`^${escapeRegExp(str)}\\d+$`, 'u'),
					series = this.getAllArgs().filter(({name}) => regex.test(name)),
					ordered = series.every(({name}, i) => {
						const j = Number(name.slice(str.length)),
							cmp = j <= i + 1 && (i === 0 || j >= last || name === key);
						last = j;
						return cmp;
					});
				if (ordered) {
					for (let i = 0; i < series.length; i++) {
						const name = `${str}${i + 1}`,
							arg = series[i]!;
						if (arg.name !== name) {
							if (arg.name === key) {
								remaining--;
							}
							arg.rename(name, true);
						}
					}
				}
			}
			if (remaining > 1) {
				Parser.error(`${this.type === 'template'
					? this.name
					: this.normalizeTitle(this.childNodes[1].text(), 828)
						.title
				} 还留有 ${remaining} 个重复的 ${key} 参数：${[...this.getArgs(key)].map(arg => {
					const {top, left} = arg.getBoundingClientRect();
					return `第 ${String(top)} 行第 ${String(left)} 列`;
				}).join('、')}`);
				duplicatedKeys.push(key);
				continue;
			}
		}
		return duplicatedKeys;
	}

	/**
	 * 转义模板内的表格
	 * @throws `Error` 转义失败
	 */
	escapeTables(): TranscludeToken {
		if (!/\n[^\S\n]*(?::+[^\S\n]*)?\{\|/u.test(this.text())) {
			return this;
		}
		const stripped = String(this).slice(2, -2),
			include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			parsed = Parser.parse(stripped, include, 4, config),
			/** @ignore */
			isTable = (token: AstNodes): token is TableToken => token.type === 'table';
		for (const table of parsed.childNodes) {
			if (isTable(table)) {
				table.escape();
			}
		}
		const {firstChild, length} = Parser.parse(`{{${String(parsed)}}}`, include, undefined, config);
		if (length !== 1 || !(firstChild instanceof TranscludeToken)) {
			throw new Error('转义表格失败！');
		}
		this.safeReplaceWith(firstChild as this);
		return firstChild;
	}
}

classes['TranscludeToken'] = __filename;
