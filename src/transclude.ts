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
import Parser from '../index';
import {Token} from './index';
import {ParameterToken} from './parameter';
import {AtomToken} from './atom';
import {SyntaxToken} from './syntax';
import type {LintError} from '../base';
import type {Title} from '../lib/title';
import type {AstText} from '../internal';

const insensitiveVars = new Set<string | false | undefined>([
	'pageid',
	'articlepath',
	'server',
	'servername',
	'scriptpath',
	'stylepath',
]);

declare type Child = AtomToken | SyntaxToken;

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...AtomToken, ...ParameterToken]}`
 */
export abstract class TranscludeToken extends Token {
	readonly modifier: string = '';
	#type: 'template' | 'magic-word' = 'template';
	#raw = false;
	readonly #args = new Map<string, Set<ParameterToken>>();

	declare readonly childNodes: readonly [Child, ...ParameterToken[]]
		| readonly [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];
	abstract override get firstChild(): Child;
	abstract override get lastChild(): Child | ParameterToken;

	override get type(): 'template' | 'magic-word' {
		return this.#type;
	}

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
		let heading: number | undefined;
		const m = /^(?:\s|\0\d+[cn]\x7F)*\0(\d+)h\x7F(?:\s|\0\d+[cn]\x7F)*/u.exec(title);
		if (m) {
			heading = Number(m[1]);
			title = title.replace(`\0${heading}h\x7F`, accum[heading]!.toString().replace(/^\n/u, ''));
		}
		super(undefined, config, accum, {
		});
		const {parserFunction: [insensitive, sensitive]} = config,
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
		const isFunction = title.includes(':');
		if (isFunction || parts.length === 0 && !this.#raw) {
			const [magicWord, ...arg] = title.split(':'),
				cleaned = removeComment(magicWord!),
				name = cleaned[arg.length > 0 ? 'trimStart' : 'trim'](),
				lcName = name.toLowerCase(),
				canonicalName = Object.prototype.hasOwnProperty.call(insensitive, lcName) && insensitive[lcName],
				isSensitive = sensitive.includes(name),
				isVar = isSensitive || insensitiveVars.has(canonicalName);
			if (isVar || isFunction && canonicalName) {
				this.setAttribute('name', canonicalName || lcName.replace(/^#/u, ''));
				this.#type = 'magic-word';
				const pattern = new RegExp(String.raw`^\s*${name}\s*$`, isSensitive ? 'u' : 'iu'),
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
			const name = removeComment(title).trim();
			if (!this.normalizeTitle(name, 10, true).valid) {
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
		for (const [j, part] of parts.entries()) {
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
		return this.normalizeTitle(child.toString(true), isTemplate ? 10 : 828);
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
				this.setAttribute('name', this.#getTitle().title);
			}
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `{{${this.modifier}${
			this.type === 'magic-word'
				? `${this.firstChild.toString(skip)}${this.length === 1 ? '' : ':'}${
					this.childNodes.slice(1).map(child => child.toString(skip)).join('|')
				}`
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
					? firstChild.text() + (length === 1 ? '' : ':') + text(childNodes.slice(1), '|')
					: super.text('|')
			}}}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		switch (key) {
			case 'padding':
				return this.modifier.length + 2 as TokenAttribute<T>;
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
				textNode = child.childNodes.find(
					(c): c is AstText => c.type === 'text' && decodeHtml(c.data).includes('#'),
				);
			if (textNode) {
				const e = generateForChild(child, rect, 'no-ignored', 'useless fragment');
				e.fix = {
					range: [e.startIndex + textNode.getRelativeIndex() + textNode.data.indexOf('#'), e.endIndex],
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
		const duplicatedArgs = this.getDuplicatedArgs().filter(([, parameter]) => !parameter[0]!.querySelector('ext'));
		if (duplicatedArgs.length > 0) {
			errors.push(...duplicatedArgs.flatMap(([, args]) => args).map(
				arg => generateForChild(arg, rect, 'no-duplicate', 'duplicated parameter'),
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
		for (let i = added ? args.indexOf(addedToken) : addedToken - 1; i < args.length; i++) {
			const token = args[i]!,
				{name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				token.setAttribute('name', newName);
				this.getArgs(newName, false, false).add(token);
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
		return args;
	}

	/**
	 * 获取重名参数
	 */
	getDuplicatedArgs(): [string, ParameterToken[]][] {
		return [...this.#args].filter(([, {size}]) => size > 1).map(([key, args]) => [key, [...args]]);
	}

	/**
	 * 对特定魔术字获取可能的取值
	 * @throws `Error` 不是可接受的魔术字
	 */
	getPossibleValues(): Token[] {
		const {type, name, childNodes} = this;
		if (type === 'template') {
			throw new Error('TranscludeToken.getPossibleValues method is only for specific magic words!');
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
				throw new Error('TranscludeToken.getPossibleValues method is only for specific magic words!');
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
}
