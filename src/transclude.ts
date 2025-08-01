import {
	removeComment,
	text,
} from '../util/string';
import {
	BuildMethod,
} from '../util/constants';
import {Token} from './index';
import {ParameterToken} from './parameter';
import {AtomToken} from './atom';
import type {Config} from '../base';
import type {Title} from '../lib/title';

declare type Child = AtomToken;

/**
 * template or magic word
 *
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken, ...ParameterToken[]]}`
 */
export abstract class TranscludeToken extends Token {
	readonly modifier: string = '';
	readonly #type: 'template' | 'magic-word' = 'template';
	#colon = ':';
	#raw = false;
	readonly #args = new Map<string, Set<ParameterToken>>();
	#title: Title;

	declare readonly name: string;
	// eslint-disable-next-line @stylistic/semi
	declare readonly childNodes: readonly [Child, ...ParameterToken[]]
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
				isSensitive = Object.prototype.hasOwnProperty.call(sensitive, name),
				canonicalName = isSensitive
					? sensitive[name]!
					: Object.prototype.hasOwnProperty.call(insensitive, lcName) && insensitive[lcName]!,
				isFunc = !('functionHook' in config) || functionHook.includes(canonicalName as string),
				isVar = variable.includes(canonicalName as string);
			if (isFunction ? canonicalName && isFunc : isVar) {
				this.setAttribute(
					'name',
					canonicalName || lcName.replace(/^#|：$/u, ''),
				);
				this.#type = 'magic-word';
				if (fullWidth) {
					this.#colon = '：';
				}
				const token = new AtomToken(
					magicWord,
					'magic-word-name',
					config,
					accum,
				);
				super.insertAt(token);
				if (arg !== false) {
					parts.unshift([arg]);
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
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let j = 0; j < parts.length; j++) {
			const part = parts[j]!;
			if (!templateLike) {
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
		const magicWord = lcModifier.slice(0, -1).toLowerCase(),
			isRaw = raw.includes(magicWord),
			isSubst = subst.includes(magicWord);
		if (
			isRaw || isSubst || !modifier
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
		return this.type === 'template';
	}

	/** 获取模板或模块名 */
	#getTitle(): Title {
		const title = this.normalizeTitle(
			this.childNodes[0].text(),
			10,
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
			this.#title = this.#getTitle();
			this.setAttribute('name', this.#title.title);
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
		const {childNodes, length, firstChild, modifier, type} = this;
		return `{{${modifier}${
			type === 'magic-word'
				? firstChild.text()
				+ (length === 1 ? '' : this.#colon)
				+ text(childNodes.slice(1), '|')
				: super.text('|')
		}}}`;
	}

	/**
	 * 处理匿名参数更改
	 * @param addedToken 新增的参数
	 */
	#handleAnonArgChange(addedToken: ParameterToken): void {
		const args = this.getAnonArgs();
		const token = addedToken,
			newName = String(args.length);
		token.setAttribute('name', newName);
		this.getArgs(newName, false, false).add(token);
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
		return this.childNodes.slice(1) as ParameterToken[];
	}

	/**
	 * Get all anonymous parameters
	 *
	 * 获取所有匿名参数
	 */
	getAnonArgs(): ParameterToken[] {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	// eslint-disable-next-line jsdoc/require-param
	/**
	 * Get parameters with the specified name
	 *
	 * 获取指定参数
	 * @param key parameter name / 参数名
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
	 * Get the effective parameter with the specified name
	 *
	 * 获取生效的指定参数
	 * @param key parameter name / 参数名
	 */
	getArg(key: string | number): ParameterToken | undefined {
		const {childNodes} = this;
		return [...this.getArgs(key)].sort((a, b) => childNodes.indexOf(b) - childNodes.indexOf(a))[0];
	}

	/**
	 * Get the effective parameter value
	 *
	 * 获取生效的参数值
	 * @param key parameter name / 参数名
	 */
	getValue(key: string | number): string | undefined {
		return this.getArg(key)?.getValue();
	}

	/**
	 * Set the parameter value
	 *
	 * 设置参数值
	 * @param key parameter name / 参数名
	 * @param value parameter value / 参数值
	 */
	setValue(key: string | number, value: string): void {
		const arg = this.getArg(key);
		if (arg) {
			arg.setValue(value);
		} else {
			// @ts-expect-error abstract class
			this.insertAt(new ParameterToken(String(key), value, this.getAttribute('config')));
		}
	}
}
