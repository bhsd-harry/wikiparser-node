import {
	removeComment,
	text,
	print,
	escape,

	/* NOT FOR BROWSER */

	noWrap,
} from '../util/string';
import {generateForChild, generateForSelf} from '../util/lint';
import {isToken, Shadow} from '../util/debug';
import {
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
} from '../util/constants';
import Parser from '../index';
import {Token} from './index';
import {ParameterToken} from './parameter';
import {AtomToken} from './atom';
import {SyntaxToken} from './syntax';
import type {LintError} from '../base';
import type {Title} from '../lib/title';
import type {AstText} from '../internal';

const insensitiveVars = new Set<string | undefined>([
	'pageid',
	'articlepath',
	'server',
	'servername',
	'scriptpath',
	'stylepath',
]);

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...AtomToken, ...ParameterToken]}`
 */
export abstract class TranscludeToken extends Token {
	override type: 'template' | 'magic-word' = 'template';
	readonly modifier: string = '';

	/* NOT FOR BROWSER */

	declare readonly name: string;
	readonly #keys = new Set<string>();

	/* NOT FOR BROWSER END */

	#raw = false;
	readonly #args = new Map<string, Set<ParameterToken>>();

	declare readonly childNodes: readonly [AtomToken | SyntaxToken, ...ParameterToken[]]
	| readonly [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	abstract override get firstChild(): AtomToken | SyntaxToken;
	abstract override get lastChild(): AtomToken | SyntaxToken | ParameterToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken | SyntaxToken, ...ParameterToken[]]
	| [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	abstract override get firstElementChild(): AtomToken | SyntaxToken;
	abstract override get lastElementChild(): AtomToken | SyntaxToken | ParameterToken;

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
				lcName = name.toLowerCase(),
				canonicalName = insensitive[lcName],
				isSensitive = sensitive.includes(name),
				isVar = isSensitive || insensitiveVars.has(canonicalName);
			if (isVar || isFunction && canonicalName) {
				this.setAttribute('name', canonicalName ?? lcName);
				this.type = 'magic-word';
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				/^\s*uc\s*$/iu;
				const pattern = new RegExp(`^\\s*${name}\\s*$`, isSensitive ? 'u' : 'iu'),
					token = new SyntaxToken(magicWord, pattern, 'magic-word-name', config, accum, {
						'Stage-1': ':', '!ExtToken': '',
					});
				super.insertAt(token);
				if (arg.length > 0) {
					parts.unshift([arg.join(':')]);
				}
				if (this.name === 'invoke') {
					/* NOT FOR BROWSER */

					this.setAttribute('acceptable', {SyntaxToken: 0, AtomToken: '1:3', ParameterToken: '3:'});
					this.protectChildren('1:3');

					/* NOT FOR BROWSER END */

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
				}
			}
		}
		if (this.type === 'template') {
			const name = removeComment(title).trim();
			if (!this.normalizeTitle(name, 10, true).valid) {
				accum.pop();

				/* NOT FOR BROWSER */

				Parser.debug(`非法的模板名称：${noWrap(name)}`);

				/* NOT FOR BROWSER END */

				throw new SyntaxError('非法的模板名称');
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
			// @ts-expect-error abstract class
			this.insertAt(new ParameterToken(...part as [string | number, string], config, accum) as ParameterToken);
		}
		this.seal('modifier');

		/* NOT FOR BROWSER */

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
	#getTitle(): Title {
		const isTemplate = this.type === 'template',
			child = this.childNodes[isTemplate ? 0 : 1] as AtomToken;
		return this.normalizeTitle(child.text(), isTemplate ? 10 : 828);
	}

	/** @private */
	override afterBuild(): void {
		if (this.modifier.includes('\0')) {
			this.setAttribute('modifier', this.buildFromStr(this.modifier, BuildMethod.String));
		}

		/* NOT FOR BROWSER */

		if (this.isTemplate()) {
			const isTemplate = this.type === 'template';
			if (isTemplate || this.length > 1) {
				this.setAttribute(isTemplate ? 'name' : 'module', this.#getTitle().title);
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
					|| prevTarget === this.childNodes[1] && !isTemplate && this.name === 'invoke'
				) {
					this.setAttribute(isTemplate ? 'name' : 'module', this.#getTitle().title);
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
	override toString(): string {
		return `{{${this.modifier}${
			this.type === 'magic-word'
				? `${this.firstChild.toString()}${this.length === 1 ? '' : ':'}${
					this.childNodes.slice(1).map(String).join('|')
				}`
				: super.toString('|')
		}}}`;
	}

	/** @private */
	override text(): string {
		const {childNodes, length, firstChild, modifier, type, name} = this;
		return type === 'magic-word' && name === 'vardefine'
			? ''
			: `{{${modifier}${
				type === 'magic-word'
					? firstChild.text() + (length === 1 ? '' : ':') + text(childNodes.slice(1), '|')
					: super.text('|')
			}}}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		switch (key) {
			case 'padding':
				return this.modifier.length + 2 as TokenAttributeGetter<T>;

				/* NOT FOR BROWSER */

			case 'args':
				return new Map(this.#args) as TokenAttributeGetter<T>;
			case 'keys':
				return this.#keys as TokenAttributeGetter<T>;

				/* NOT FOR BROWSER END */

			default:
				return super.getAttribute(key);
		}
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{type, childNodes, length} = this;
		let rect: BoundingRect | undefined;
		if (!this.isTemplate()) {
			return errors;
		}
		const title = this.#getTitle();
		if (title.fragment !== undefined) {
			rect = {start, ...this.getRootNode().posFromIndex(start)!};
			const child = childNodes[type === 'template' ? 0 : 1] as AtomToken,
				e = generateForChild(child, rect, 'no-ignored', 'useless fragment'),
				textNode = child.childNodes.find((c): c is AstText => c.type === 'text' && c.data.includes('#'));
			if (textNode) {
				e.fix = {
					range: [e.startIndex + textNode.getRelativeIndex() + textNode.data.indexOf('#'), e.endIndex],
					text: '',
				};
			}
			errors.push(e);
		}
		if (!title.valid) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(generateForChild(childNodes[1], rect, 'invalid-invoke', 'illegal module name'));
		}
		if (type === 'magic-word' && length === 2) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(generateForSelf(this, rect, 'invalid-invoke', 'missing module function'));
			return errors;
		}
		const duplicatedArgs = this.getDuplicatedArgs().filter(([, parameter]) => !parameter[0]!.querySelector('ext'));
		if (duplicatedArgs.length > 0) {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			errors.push(...duplicatedArgs.flatMap(([, args]) => args).map(
				arg => generateForChild(arg, rect!, 'no-duplicate', 'duplicated parameter'),
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

		/* NOT FOR BROWSER */

		const maxAnon = String(args.length + (added ? 0 : 1));
		if (added) {
			this.#keys.add(maxAnon);
		} else if (!this.hasArg(maxAnon, true)) {
			this.#keys.delete(maxAnon);
		}

		/* NOT FOR BROWSER END */

		for (let i = added ? args.indexOf(addedToken) : addedToken - 1; i < args.length; i++) {
			const token = args[i]!,
				{name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				token.setAttribute('name', newName);
				this.getArgs(newName, false, false).add(token);

				/* NOT FOR BROWSER */

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

			/* NOT FOR BROWSER */

			this.#keys.add(token.name);
		}
		return token;
	}

	/** 获取所有参数 */
	getAllArgs(): ParameterToken[] {
		return this.childNodes.filter(isToken<ParameterToken>('parameter'));
	}

	/** 获取所有匿名参数 */
	getAnonArgs(): ParameterToken[] {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/**
	 * 获取指定参数
	 * @param key 参数名
	 * @param exact 是否匹配匿名性
	 * @param copy 是否返回一个备份
	 */
	getArgs(key: string | number, exact?: boolean, copy = true): Set<ParameterToken> {
		const keyStr = String(key).replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');
		let args: Set<ParameterToken>;
		if (this.#args.has(keyStr)) {
			args = this.#args.get(keyStr)!;
		} else {
			args = new Set(this.getAllArgs().filter(({name}) => keyStr === name));
			this.#args.set(keyStr, args);
		}

		/* NOT FOR BROWSER */

		if (exact && keyStr.trim() && !isNaN(keyStr as unknown as number)) {
			args = new Set([...args].filter(({anon}) => typeof key === 'number' === anon));
		} else if (copy) {
			args = new Set(args);
		}

		/* NOT FOR BROWSER END */

		return args;
	}

	/**
	 * 获取重名参数
	 * @throws `Error` 仅用于模板
	 */
	getDuplicatedArgs(): [string, ParameterToken[]][] {
		if (this.isTemplate()) {
			return [...this.#args].filter(([, {size}]) => size > 1).map(([key, args]) => [key, [...args]]);
		}
		throw new Error('getDuplicatedArgs 方法仅供模板使用！');
	}

	/**
	 * 对特定魔术字获取可能的取值
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

	/** @private */
	override print(): string {
		const {childNodes, length, firstChild, modifier, type} = this;
		return `<span class="wpb-${type}">{{${escape(modifier)}${
			type === 'magic-word'
				? firstChild.print() + (length === 1 ? '' : ':') + print(childNodes.slice(1), {sep: '|'})
				: print(childNodes, {sep: '|'})
		}}}</span>`;
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [first, ...cloned] = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
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
	hasArg(key: string | number, exact?: boolean): boolean {
		return this.getArgs(key, exact, false).size > 0;
	}

	/**
	 * 获取生效的指定参数
	 * @param key 参数名
	 * @param exact 是否匹配匿名性
	 */
	getArg(key: string | number, exact?: boolean): ParameterToken | undefined {
		const args = [...this.getArgs(key, exact, false)].sort((a, b) => a.compareDocumentPosition(b));
		return args[args.length - 1];
	}

	/**
	 * 移除指定参数
	 * @param key 参数名
	 * @param exact 是否匹配匿名性
	 */
	removeArg(key: string | number, exact?: boolean): void {
		Shadow.run(() => {
			for (const token of this.getArgs(key, exact, false)) {
				this.removeChild(token);
			}
		});
	}

	/** 获取所有参数名 */
	getKeys(): string[] {
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
	getValues(key: string | number): string[] {
		return [...this.getArgs(key, false, false)].map(token => token.getValue());
	}

	/**
	 * 获取生效的参数值
	 * @param key 参数名
	 */
	getValue(): Record<string, string>;
	getValue(key: string | number): string | undefined;
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
		require('../addon/transclude');
		return this.newAnonArg(val);
	}

	/**
	 * 设置参数值
	 * @param key 参数名
	 * @param value 参数值
	 * @throws `Error` 仅用于模板
	 */
	setValue(key: string, value: string): void {
		require('../addon/transclude');
		this.setValue(key, value);
	}

	/**
	 * 将匿名参数改写为命名参数
	 * @throws `Error` 仅用于模板
	 */
	anonToNamed(): void {
		if (!this.isTemplate()) {
			throw new Error('anonToNamed 方法仅供模板使用！');
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
		require('../addon/transclude');
		this.replaceTemplate(title);
	}

	/**
	 * 替换模块名
	 * @param title 模块名
	 * @throws `Error` 仅用于模块
	 */
	replaceModule(title: string): void {
		require('../addon/transclude');
		this.replaceModule(title);
	}

	/**
	 * 替换模块函数
	 * @param func 模块函数名
	 * @throws `Error` 仅用于模块
	 * @throws `Error` 尚未指定模块名称
	 */
	replaceFunction(func: string): void {
		require('../addon/transclude');
		this.replaceFunction(func);
	}

	/**
	 * 重复参数计数
	 * @throws `Error` 仅用于模板
	 */
	hasDuplicatedArgs(): number {
		if (this.isTemplate()) {
			return this.getAllArgs().length - this.getKeys().length;
		}
		throw new Error('hasDuplicatedArgs 方法仅供模板使用！');
	}

	/**
	 * 修复重名参数：
	 * `aggressive = false`时只移除空参数和全同参数，优先保留匿名参数，否则将所有匿名参数更改为命名。
	 * `aggressive = true`时还会尝试处理连续的以数字编号的参数。
	 * @param aggressive 是否使用有更大风险的修复手段
	 */
	fixDuplication(aggressive?: boolean): string[] {
		require('../addon/transclude');
		return this.fixDuplication(aggressive);
	}

	/**
	 * 转义模板内的表格
	 * @throws `Error` 转义失败
	 */
	escapeTables(): TranscludeToken {
		require('../addon/transclude');
		return this.escapeTables();
	}
}

classes['TranscludeToken'] = __filename;
