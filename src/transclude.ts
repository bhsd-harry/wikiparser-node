import {
	removeComment,
	text,
	decodeHtml,
	print,
	escape,

	/* NOT FOR BROWSER */

	noWrap,
} from '../util/string';
import {generateForChild, generateForSelf, fixByRemove} from '../util/lint';
import {isToken, Shadow} from '../util/debug';
import {
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
} from '../util/constants';
import {BoundingRect} from '../lib/rect';
import {gapped} from '../mixin/gapped';
import {noEscape} from '../mixin/noEscape';
import Parser from '../index';
import {Token} from './index';
import {ParameterToken} from './parameter';
import {AtomToken} from './atom';
import {SyntaxToken} from './syntax';
import type {Config, LintError} from '../base';
import type {Title} from '../lib/title';
import type {AstText} from '../internal';

/* NOT FOR BROWSER */

import {cached} from '../mixin/cached';

declare interface Frame {
	args: Record<string, string>;
	parent?: Frame | undefined;
	title: string;
}

const basicMagicWords = new Map([['=', '='], ['!', '|']]);

/* NOT FOR BROWSER END */

declare type Child = AtomToken | SyntaxToken;

/**
 * template or magic word
 *
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...AtomToken[], ...ParameterToken[]]}`
 */
@noEscape @gapped()
export abstract class TranscludeToken extends Token {
	readonly modifier: string = '';
	readonly #type: 'template' | 'magic-word' = 'template';
	#colon = ':';
	#raw = false;
	readonly #args = new Map<string, Set<ParameterToken>>();
	#title: Title;

	/* NOT FOR BROWSER */

	readonly #keys = new Set<string>();

	/* NOT FOR BROWSER END */

	declare readonly name: string;
	declare readonly childNodes: readonly [Child, ...ParameterToken[]]
		| readonly [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	abstract override get firstChild(): Child;
	abstract override get lastChild(): Child | ParameterToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [Child, ...ParameterToken[]]
		| [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	abstract override get firstElementChild(): Child;
	abstract override get lastElementChild(): Child | ParameterToken;

	/* NOT FOR BROWSER END */

	override get type(): 'template' | 'magic-word' {
		return this.#type;
	}

	/**
	 * module name
	 *
	 * 模块名
	 * @since v1.21.0
	 */
	get module(): string | undefined {
		// eslint-disable-next-line no-unused-labels
		LSP: return this.type === 'magic-word' && this.name === 'invoke' ? this.#getTitle().title : undefined;
	}

	/**
	 * function name
	 *
	 * 函数名
	 * @since v1.21.2
	 */
	get function(): string | undefined {
		LSP: return this.type === 'magic-word' && this.name === 'invoke' // eslint-disable-line no-unused-labels
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			? this.childNodes[2]?.text().trim()
			: undefined;
	}

	/* NOT FOR BROWSER */

	/** whether to contain duplicated parameters / 是否存在重复参数 */
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
		config: Config,
		accum: Token[] = [],
	) {
		let heading: number | undefined;
		const m = /^(?:\s|\0\d+[cn]\x7F)*\0(\d+)h\x7F(?:\s|\0\d+[cn]\x7F)*/u.exec(title);
		if (m) {
			heading = Number(m[1]);
			title = title.replace(
				`\0${heading}h\x7F`,
				accum[heading]!.toString().replace(/^\n/u, ''),
			);
		}
		super(undefined, config, accum, {
			AtomToken: 0, SyntaxToken: 0, ParameterToken: '1:',
		});
		const {parserFunction: [insensitive, sensitive], variable, functionHook} = config,
			argSubst = /^(?:\s|\0\d+[cn]\x7F)*\0\d+s\x7F/u.exec(title)?.[0];
		if (argSubst) {
			this.setAttribute('modifier', argSubst);
			title = title.slice(argSubst.length);
		} else if (title.includes(':')) {
			const [modifier, ...arg] = title.split(':'),
				[mt] = /^(?:\s|\0\d+[cn]\x7F)*/u.exec(arg[0] ?? '')!;
			if (this.setModifier(`${modifier!}:${mt}`)) {
				title = arg.join(':').slice(mt.length);
			}
		}
		const colon = title.search(/[:：]/u),
			fullWidth = title[colon] === '：',
			isFunction = colon !== -1;
		if (isFunction || parts.length === 0 && !this.#raw) {
			const magicWord = isFunction ? title.slice(0, colon) : title,
				arg = isFunction && title.slice(colon + 1),
				cleaned = removeComment(magicWord),
				name = isFunction
					? cleaned.slice(cleaned.search(/\S/u)) + (fullWidth ? '：' : '')
					: cleaned.trim(),
				lcName = name.toLowerCase(),
				isOldSchema = Array.isArray(sensitive),
				isSensitive = isOldSchema
					? sensitive.includes(name)
					: Object.prototype.hasOwnProperty.call(sensitive, name),
				canonicalName = !isOldSchema && isSensitive
					? sensitive[name]!
					: Object.prototype.hasOwnProperty.call(insensitive, lcName) && insensitive[lcName]!,
				isFunc = isOldSchema && isSensitive
					|| !('functionHook' in config) || functionHook.includes(canonicalName as string),
				isVar = isOldSchema && isSensitive || variable.includes(canonicalName as string);
			if (isFunction ? canonicalName && isFunc : isVar) {
				this.setAttribute(
					'name',
					canonicalName || lcName.replace(/^#|：$/u, ''),
				);
				this.#type = 'magic-word';
				if (fullWidth) {
					this.#colon = '：';
				}
				/^\s*uc\s*$/iu; // eslint-disable-line @typescript-eslint/no-unused-expressions
				const token = new SyntaxToken(
					magicWord,
					new RegExp(String.raw`^\s*${name}\s*$`, isSensitive ? 'u' : 'iu'),
					'magic-word-name',
					config,
					accum,
					{'Stage-1': ':', '!ExtToken': ''},
				);
				super.insertAt(token);
				if (arg !== false) {
					parts.unshift([arg]);
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
							{'Stage-2': ':', '!ExtToken': '', '!HeadingToken': ''},
						);
						super.insertAt(invoke);
					}
				}
			}
		}
		if (this.type === 'template') {
			const name = removeComment(title).trim();
			if (!this.normalizeTitle(name, 10, {halfParsed: true, temporary: true}).valid) {
				accum.pop();

				/* NOT FOR BROWSER */

				Parser.debug(`Invalid template name: ${noWrap(name)}`);

				/* NOT FOR BROWSER END */

				throw new SyntaxError('Invalid template name');
			}
			const token = new AtomToken(title, 'template-name', config, accum, {
				'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
			});
			super.insertAt(token);
		}
		if (typeof heading === 'number') {
			// @ts-expect-error sparse array
			accum[heading] = undefined;
		}
		const templateLike = this.isTemplate();
		let i = 1;
		for (let j = 0; j < parts.length; j++) {
			const part = parts[j]!;
			if (!(templateLike || this.name === 'switch' && j > 0 || this.name === 'tag' && j > 1)) {
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

		/* PRINT ONLY */

		this.seal('modifier');

		/* PRINT ONLY END */

		/* NOT FOR BROWSER */

		this.protectChildren(0);
	}

	/**
	 * Set the transclusion modifier
	 *
	 * 设置引用修饰符
	 * @param modifier transclusion modifier / 引用修饰符
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
			|| !this.#raw && (isSubst || !modifier)
			|| (Shadow.running || this.length > 1) && (isRaw || isSubst || !modifier)
		) {
			this.setAttribute('modifier', modifier);
			this.#raw = isRaw;
			return Boolean(modifier);
		}
		return false;
	}

	/**
	 * Check if it is a template or a module
	 *
	 * 是否是模板或模块
	 */
	isTemplate(): boolean {
		return this.type === 'template' || this.name === 'invoke';
	}

	/** 获取模板或模块名 */
	#getTitle(): Title {
		const isTemplate = this.type === 'template',
			title = this.normalizeTitle(
				this.childNodes[isTemplate ? 0 : 1].text(),
				isTemplate ? 10 : 828,
				{temporary: true},
			);

		/* NOT FOR BROWSER */

		title.fragment = undefined;

		/* NOT FOR BROWSER END */

		return title;
	}

	/** @private */
	override afterBuild(): void {
		if (this.modifier.includes('\0')) {
			this.setAttribute('modifier', this.buildFromStr(this.modifier, BuildMethod.String));
		}
		super.afterBuild();
		if (this.isTemplate()) {
			const isTemplate = this.type === 'template';
			if (isTemplate) {
				this.#title = this.#getTitle();
				this.setAttribute('name', this.#title.title);
			}

			/* NOT FOR BROWSER */

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
				if (prevTarget === this.firstChild && isTemplate) {
					this.#title = this.#getTitle();
					this.setAttribute('name', this.#title.title);
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
	override toString(skip?: boolean): string {
		const {childNodes, length, firstChild, modifier, type} = this;
		return `{{${modifier}${
			type === 'magic-word'
				? firstChild.toString(skip)
				+ (length === 1 ? '' : this.#colon)
				+ childNodes.slice(1).map(child => child.toString(skip)).join('|')
				: super.toString(skip, '|')
		}}}`;
	}

	/** @private */
	override text(): string {
		const {childNodes, length, firstChild, modifier, type, name} = this;
		return type === 'magic-word' && name === 'vardefine'
			? ''
			: `{{${modifier}${
				type === 'magic-word'
					? firstChild.text()
					+ (length === 1 ? '' : this.#colon)
					+ text(childNodes.slice(1), '|')
					: super.text('|')
			}}}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		switch (key) {
			case 'padding':
				return this.modifier.length + 2 as TokenAttribute<T>;
			case 'title':
				return this.#title as TokenAttribute<T>;
			case 'colon':
				return this.#colon as TokenAttribute<T>;

				/* PRINT ONLY */

			case 'invalid':
				return (
					this.type === 'magic-word' && this.name === 'invoke'
					&& (this.length === 2 || !this.#getTitle().valid)
				) as TokenAttribute<T>;

				/* PRINT ONLY END */

				/* NOT FOR BROWSER */

			case 'keys':
				return this.#keys as TokenAttribute<T>;

				/* NOT FOR BROWSER END */

			default:
				return super.getAttribute(key);
		}
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re);
			if (!this.isTemplate()) {
				return errors;
			}
			const {type, childNodes, length} = this,
				rect = new BoundingRect(this, start),
				{lintConfig} = Parser,
				{computeEditInfo} = lintConfig,
				invoke = type === 'magic-word';
			let rule: LintError.Rule = 'no-ignored',
				s = lintConfig.getSeverity(rule, 'fragment');
			if (invoke && !this.#getTitle().valid) {
				rule = 'invalid-invoke';
				s = lintConfig.getSeverity(rule, 'name');
				if (s) {
					errors.push(generateForChild(childNodes[1], rect, rule, 'illegal-module', s));
				}
			} else if (s) {
				const child = childNodes[invoke ? 1 : 0] as AtomToken,
					i = child.childNodes
						.findIndex(c => c.type === 'text' && decodeHtml(c.data).includes('#')),
					textNode = child.childNodes[i] as AstText | undefined;
				if (textNode) {
					const e = generateForChild(child, rect, rule, 'useless-fragment', s);
					if (computeEditInfo) {
						e.suggestions = [
							fixByRemove(
								e,
								child.getRelativeIndex(i) + textNode.data.indexOf('#'),
							),
						];
					}
					errors.push(e);
				}
			}
			rule = 'invalid-invoke';
			s = lintConfig.getSeverity(rule, 'function');
			if (s && invoke && length === 2) {
				errors.push(generateForSelf(this, rect, rule, 'missing-function', s));
				return errors;
			}
			rule = 'no-duplicate';
			s = lintConfig.getSeverity(rule, 'parameter');
			if (s) {
				const duplicatedArgs = this.getDuplicatedArgs()
						.filter(([, parameter]) => !parameter[0]!.querySelector('ext')),
					msg = 'duplicate-parameter';
				for (const [, args] of duplicatedArgs) {
					errors.push(...args.map(arg => {
						const e = generateForChild(arg, rect, rule, msg, s);
						if (computeEditInfo) {
							e.suggestions = [fixByRemove(e, -1)];
						}
						return e;
					}));
				}
			}
			return errors;
		}
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
			if (name !== newName || token === addedToken) {
				token.setAttribute('name', newName);
				this.getArgs(newName, false, false).add(token);

				/* NOT FOR BROWSER */

				if (name && token !== addedToken) {
					this.getArgs(name, false, false).delete(token);
				}
			}
		}
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
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

	/**
	 * Get all parameters
	 *
	 * 获取所有参数
	 */
	getAllArgs(): ParameterToken[] {
		return this.childNodes.filter(isToken<ParameterToken>('parameter'));
	}

	/**
	 * Get all anonymous parameters
	 *
	 * 获取所有匿名参数
	 */
	getAnonArgs(): ParameterToken[] {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/**
	 * Get parameters with the specified name
	 *
	 * 获取指定参数
	 * @param key parameter name / 参数名
	 * @param exact whether to match anonymosity / 是否匹配匿名性
	 * @param copy whether to return a copy / 是否返回一个备份
	 */
	getArgs(key: string | number, exact?: boolean, copy = true): Set<ParameterToken> {
		const keyStr = String(key)
			.replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');
		let args: Set<ParameterToken>;
		if (this.#args.has(keyStr)) {
			args = this.#args.get(keyStr)!;
		} else {
			args = new Set(this.getAllArgs().filter(({name}) => keyStr === name));
			this.#args.set(keyStr, args);
		}

		/* NOT FOR BROWSER */

		if (exact && keyStr.trim() && Number.isInteger(Number(keyStr))) {
			args = new Set([...args].filter(({anon}) => typeof key === 'number' === anon));
		} else if (copy) {
			args = new Set(args);
		}

		/* NOT FOR BROWSER END */

		return args;
	}

	/**
	 * Get duplicated parameters
	 *
	 * 获取重名参数
	 * @throws `Error` 仅用于模板
	 */
	getDuplicatedArgs(): [string, ParameterToken[]][] {
		if (this.isTemplate()) {
			return [...this.#args].filter(([, {size}]) => size > 1).map(([key, args]) => [key, [...args]]);
		}
		throw new Error('TranscludeToken.getDuplicatedArgs method is only for template!');
	}

	/**
	 * Get possible values of some magic words
	 *
	 * 对特定魔术字获取可能的取值
	 * @throws `Error` 不是可接受的魔术字
	 */
	getPossibleValues(): Token[] {
		const {type, name, childNodes} = this;
		if (type === 'template') {
			throw new Error('TranscludeToken.getPossibleValues method is only for specific magic words!');
		}
		let start: number | undefined,
			queue: Token[] | undefined;
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
			case 'switch': {
				const parameters = childNodes.slice(2) as ParameterToken[],
					last = parameters[parameters.length - 1];
				queue = [
					...parameters.filter(({anon}) => !anon),
					...last?.anon ? [last] : [],
				].map(({lastChild}) => lastChild);
				break;
			}
			default:
				throw new Error('TranscludeToken.getPossibleValues method is only for specific magic words!');
		}
		queue ??= (childNodes.slice(start, start! + 2) as ParameterToken[]).map(({lastChild}) => lastChild);
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
		return `<span class="wpb-${type}${
			this.getAttribute('invalid') ? ' wpb-invalid' : ''
		}">{{${
			type === 'magic-word'
				? escape(modifier)
				+ firstChild.print()
				+ (length === 1 ? '' : this.#colon)
				+ print(childNodes.slice(1), {sep: '|'})
				: (modifier ? `<span class="wpb-magic-word">${escape(modifier)}</span>` : '')
					+ print(childNodes, {sep: '|'})
		}}}</span>`;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [first, ...cloned] = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new TranscludeToken(
				this.type === 'template' ? 'T' : first!.text() + (cloned.length === 0 ? '' : this.#colon),
				[],
				config,
			);
			if (this.#raw) {
				token.setModifier(this.modifier);
			} else {
				token.setAttribute('modifier', this.modifier);
			}
			token.firstChild.safeReplaceWith(first as never);
			if (token.length > 1) {
				token.removeAt(1);
			}
			token.safeAppend(cloned);
			return token;
		});
	}

	/**
	 * Convert to substitution
	 *
	 * 替换引用
	 */
	subst(): void {
		this.setModifier('subst:');
	}

	/**
	 * Convert to safe substitution
	 *
	 * 安全的替换引用
	 */
	safesubst(): void {
		this.setModifier('safesubst:');
	}

	/**
	 * @override
	 * @param i position of the child node / 移除位置
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
	 * Check if there is a parameter with the specified name
	 *
	 * 是否具有某参数
	 * @param key parameter name / 参数名
	 * @param exact whether to match anonymosity / 是否匹配匿名性
	 */
	hasArg(key: string | number, exact?: boolean): boolean {
		return this.getArgs(key, exact, false).size > 0;
	}

	/**
	 * Get the effective parameter with the specified name
	 *
	 * 获取生效的指定参数
	 * @param key parameter name / 参数名
	 * @param exact whether to match anonymosity / 是否匹配匿名性
	 */
	getArg(key: string | number, exact?: boolean): ParameterToken | undefined {
		return [...this.getArgs(key, exact, false)].sort((a, b) => b.compareDocumentPosition(a))[0];
	}

	/**
	 * Remove parameters with the specified name
	 *
	 * 移除指定参数
	 * @param key parameter name / 参数名
	 * @param exact whether to match anonymosity / 是否匹配匿名性
	 */
	removeArg(key: string | number, exact?: boolean): void {
		Shadow.run(() => {
			for (const token of this.getArgs(key, exact, false)) {
				this.removeChild(token);
			}
		});
	}

	/**
	 * Get all parameter names
	 *
	 * 获取所有参数名
	 */
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
	 * Get parameter values
	 *
	 * 获取参数值
	 * @param key parameter name / 参数名
	 */
	getValues(key: string | number): string[] {
		return [...this.getArgs(key, false, false)].map(token => token.getValue());
	}

	/**
	 * Get the effective parameter value
	 *
	 * 获取生效的参数值
	 * @param key parameter name / 参数名
	 */
	getValue(): Record<string, string>;
	getValue(key: string | number): string | undefined;
	getValue(key?: string | number): Record<string, string> | string | undefined {
		return key === undefined
			? Object.fromEntries(this.getKeys().map(k => [k, this.getValue(k)!]))
			: this.getArg(key)?.getValue();
	}

	/**
	 * Insert an anonymous parameter
	 *
	 * 插入匿名参数
	 * @param val parameter value / 参数值
	 */
	newAnonArg(val: string): ParameterToken {
		require('../addon/transclude');
		return this.newAnonArg(val);
	}

	/**
	 * Set the parameter value
	 *
	 * 设置参数值
	 * @param key parameter name / 参数名
	 * @param value parameter value / 参数值
	 * @throws `Error` 仅用于模板
	 */
	setValue(key: string, value: string): void {
		require('../addon/transclude');
		this.setValue(key, value);
	}

	/**
	 * Convert all anonymous parameters to named ones
	 *
	 * 将匿名参数改写为命名参数
	 * @throws `Error` 仅用于模板
	 */
	anonToNamed(): void {
		if (!this.isTemplate()) {
			throw new Error('TranscludeToken.anonToNamed method is only for template!');
		}
		for (const token of this.getAnonArgs()) {
			token.firstChild.replaceChildren(token.name);
		}
	}

	/**
	 * Replace the template name
	 *
	 * 替换模板名
	 * @param title template name / 模板名
	 * @throws `Error` 仅用于模板
	 */
	replaceTemplate(title: string): void {
		require('../addon/transclude');
		this.replaceTemplate(title);
	}

	/**
	 * Replace the module name
	 *
	 * 替换模块名
	 * @param title module name / 模块名
	 * @throws `Error` 仅用于模块
	 */
	replaceModule(title: string): void {
		require('../addon/transclude');
		this.replaceModule(title);
	}

	/**
	 * Replace the module function
	 *
	 * 替换模块函数
	 * @param func module function name / 模块函数名
	 * @throws `Error` 仅用于模块
	 * @throws `Error` 尚未指定模块名称
	 */
	replaceFunction(func: string): void {
		require('../addon/transclude');
		this.replaceFunction(func);
	}

	/**
	 * Count duplicated parameters
	 *
	 * 重复参数计数
	 * @throws `Error` 仅用于模板
	 */
	hasDuplicatedArgs(): number {
		if (this.isTemplate()) {
			return this.getAllArgs().length - this.getKeys().length;
		}
		throw new Error('TranscludeToken.hasDuplicatedArgs method is only for template!');
	}

	/**
	 * Fix duplicated parameters
	 * @description
	 * - Only empty parameters and identical parameters are removed with `aggressive = false`.
	 * Anonymous parameters have a higher precedence, otherwise all anonymous parameters are converted to named ones.
	 * - Additionally, consecutive numbered parameters are treated with `aggressive = true`.
	 *
	 * 修复重名参数
	 * @description
	 * - `aggressive = false`时只移除空参数和全同参数，优先保留匿名参数，否则将所有匿名参数更改为命名。
	 * - `aggressive = true`时还会尝试处理连续的以数字编号的参数。
	 * @param aggressive whether to use a more risky approach / 是否使用有更大风险的修复手段
	 */
	fixDuplication(aggressive?: boolean): string[] {
		require('../addon/transclude');
		return this.fixDuplication(aggressive);
	}

	/**
	 * Escape tables inside the template
	 *
	 * 转义模板内的表格
	 * @throws `Error` 转义失败
	 */
	escapeTables(): this {
		require('../addon/transclude');
		return this.escapeTables();
	}

	/**
	 * Get the module name and module function name
	 *
	 * 获取模块名和模块函数名
	 * @since v1.16.4
	 * @throws `Error` 仅用于模块
	 */
	getModule(): [string, string | undefined] {
		/* istanbul ignore if */
		if (this.type !== 'magic-word' || this.name !== 'invoke') {
			throw new Error('TranscludeToken.getModule method is only for modules!');
		}
		return [this.module!, this.function];
	}

	/**
	 * Get the [frame object](https://www.mediawiki.org/wiki/Extension:Scribunto/Lua_reference_manual#frame-object)
	 *
	 * 获取 [frame 对象](https://www.mediawiki.org/wiki/Extension:Scribunto/Lua_reference_manual#frame-object)
	 * @param context template calling this module / 调用该模块的模板
	 * @since v1.22.0
	 * @throws `Error` 仅用于模块
	 */
	getFrame(context?: this): Frame {
		/* istanbul ignore if */
		if (this.type === 'magic-word' && this.name !== 'invoke' || this.type === 'template' && context) {
			throw new Error('TranscludeToken.getFrame method is only for modules!');
		}
		return {
			args: this.getValue(),
			parent: context?.getFrame(),
			title: this.#getTitle().toString(true),
		};
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		const {type, name} = this;
		if (type === 'template' && !name.startsWith('Special:')) {
			if (this.normalizeTitle(name, 0, {halfParsed: true, temporary: true}).valid) {
				const title = name.replaceAll('_', ' ');
				return `<a href="${this.#title.getUrl()}?action=edit&redlink=1" class="new" title="${
					title
				} (page does not exist)">${title}</a>`;
			}
			const str = this.text();
			return opt?.nowrap ? str.replaceAll('\n', ' ') : str;
		}
		return basicMagicWords.has(name) ? basicMagicWords.get(name)! : '';
	}
}

classes['TranscludeToken'] = __filename;
