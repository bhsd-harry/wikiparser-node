import {
	removeComment,
	text,
	decodeHtml,
	print,
	escape,
} from '../util/string';
import {generateForChild, generateForSelf} from '../util/lint';
import {isToken, Shadow} from '../util/debug';
import {
	BuildMethod,
} from '../util/constants';
import {BoundingRect} from '../lib/rect';
import {gapped} from '../mixin/gapped';
import {Token} from './index';
import {ParameterToken} from './parameter';
import {AtomToken} from './atom';
import {SyntaxToken} from './syntax';
import type {Config, LintError} from '../base';
import type {Title} from '../lib/title';
import type {AstText} from '../internal';

declare type Child = AtomToken | SyntaxToken;

/**
 * template or magic word
 *
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...AtomToken[], ...ParameterToken[]]}`
 */
@gapped()
export abstract class TranscludeToken extends Token {
	readonly modifier: string = '';
	readonly #type: 'template' | 'magic-word' = 'template';
	#colon = ':';
	#raw = false;
	readonly #args = new Map<string, Set<ParameterToken>>();
	#title: Title;

	declare readonly name: string;
	declare readonly childNodes: readonly [Child, ...ParameterToken[]]
		| readonly [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	abstract override get firstChild(): Child;
	abstract override get lastChild(): Child | ParameterToken;

	override get type(): 'template' | 'magic-word' {
		return this.#type;
	}

	/** module name / 模块名 */
	get module(): string | undefined {
		// eslint-disable-next-line no-unused-labels
		LSP: return this.type === 'magic-word' && this.name === 'invoke' ? this.#getTitle().title : undefined;
	}

	/** function name / 函数名 */
	get function(): string | undefined {
		LSP: return this.type === 'magic-word' && this.name === 'invoke' // eslint-disable-line no-unused-labels
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			? this.childNodes[2]?.text().trim()
			: undefined;
	}

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
				const token = new SyntaxToken(
					magicWord,
					'magic-word-name',
					config,
					accum,
				);
				super.insertAt(token);
				if (arg !== false) {
					parts.unshift([arg]);
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
			const name = removeComment(title).trim();
			if (!this.normalizeTitle(name, 10, {halfParsed: true, temporary: true}).valid) {
				accum.pop();
				throw new SyntaxError('Invalid template name');
			}
			const token = new AtomToken(title, 'template-name', config, accum, {
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
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `{{${this.modifier}${
			this.type === 'magic-word'
				? this.firstChild.toString(skip)
				+ (this.length === 1 ? '' : this.#colon)
				+ this.childNodes.slice(1).map(child => child.toString(skip)).join('|')
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

			default:
				return super.getAttribute(key);
		}
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		if (!this.isTemplate()) {
			return errors;
		}
		const {type, childNodes, length} = this,
			rect = new BoundingRect(this, start),
			invoke = type === 'magic-word';
		if (invoke && !this.#getTitle().valid) {
			errors.push(generateForChild(childNodes[1], rect, 'invalid-invoke', 'illegal module name'));
		} else {
			const child = childNodes[invoke ? 1 : 0] as AtomToken,
				i = child.childNodes
					.findIndex(c => c.type === 'text' && decodeHtml(c.data).includes('#')),
				textNode = child.childNodes[i] as AstText | undefined;
			if (textNode) {
				const e = generateForChild(
					child,
					rect,
					'no-ignored',
					'useless fragment',
					'warning',
				);
				e.fix = {
					range: [
						e.startIndex + child.getRelativeIndex(i) + textNode.data.indexOf('#'),
						e.endIndex,
					],
					text: '',
					desc: 'remove',
				};
				errors.push(e);
			}
		}
		if (invoke && length === 2) {
			errors.push(generateForSelf(this, rect, 'invalid-invoke', 'missing module function'));
			return errors;
		}
		const duplicatedArgs = this.getDuplicatedArgs()
			.filter(([, parameter]) => !parameter[0]!.querySelector('ext'));
		if (duplicatedArgs.length > 0) {
			for (const [, args] of duplicatedArgs) {
				errors.push(...args.map(arg => {
					const e = generateForChild(arg, rect, 'no-duplicate', 'duplicated parameter');
					e.suggestions = [{desc: 'remove', range: [e.startIndex - 1, e.endIndex], text: ''}];
					return e;
				}));
			}
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
		for (let i = added ? args.indexOf(addedToken) : addedToken - 1; i < args.length; i++) {
			const token = args[i]!,
				{name} = token,
				newName = String(i + 1);
			if (name !== newName || token === addedToken) {
				token.setAttribute('name', newName);
				this.getArgs(newName, false, false).add(token);
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
		return args;
	}

	/**
	 * Get duplicated parameters
	 *
	 * 获取重名参数
	 */
	getDuplicatedArgs(): [string, ParameterToken[]][] {
		return [...this.#args].filter(([, {size}]) => size > 1).map(([key, args]) => [key, [...args]]);
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
}
