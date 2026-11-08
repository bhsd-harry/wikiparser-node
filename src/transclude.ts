import {
	removeComment,

	/* NOT FOR BROWSER */

	sanitizeId,
} from '../util/string';
import {
	getMagicWordInfo,
	Shadow,
} from '../util/debug';
import {
	BuildMethod,
} from '../util/constants';
import {gapped} from '../mixin/gapped';
import {Token} from './index';
import {ParameterToken} from './parameter';
import {AtomToken} from './atom';
import {SyntaxToken} from './syntax';
import type {
	Config,
} from '../base';
import type {Title} from '../lib/title';

/* NOT FOR BROWSER */

import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

export const invalidTemplateMsg = 'Invalid template name';

const sortArgs = /** @ignore */ ({childNodes}: TranscludeToken, args: Set<ParameterToken>): ParameterToken[] =>
	[...args].sort((a, b) => childNodes.indexOf(a) - childNodes.indexOf(b));

/**
 * template or magic word
 *
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...ParameterToken[]]}`
 */
@gapped()
export abstract class TranscludeToken extends Token {
	readonly modifier: string = '';
	readonly #type: 'template' | 'magic-word' = 'template';
	#colon = ':';
	#raw = false;
	readonly #args = new Map<string, Set<ParameterToken>>();
	#anonCount = 0;
	// @ts-expect-error lazy initialization
	#title: Title;

	/* NOT FOR BROWSER */

	readonly #keys = new Set<string>();

	/* NOT FOR BROWSER END */

	declare readonly name: string;
	declare readonly childNodes: readonly [
		SyntaxToken,
		AtomToken,
		AtomToken,
		...ParameterToken[],
	]
	| readonly [AtomToken | SyntaxToken, ...ParameterToken[]];
	abstract override get firstChild(): AtomToken
		| SyntaxToken;
	abstract override get lastChild(): AtomToken
		| SyntaxToken
		| ParameterToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken | SyntaxToken, ...ParameterToken[]]
		| [SyntaxToken, AtomToken, AtomToken, ...ParameterToken[]];

	/* NOT FOR BROWSER END */

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
				() => accum[heading!]!.toString().replace(/^\n/u, ''),
			);
		}
		super(undefined, config, accum, {
		});
		const {parserFunction, variable, functionHook} = config,
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
				name = isFunction ? cleaned.trimStart() + (fullWidth ? '：' : '') : cleaned.trim(),
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				[, isSensitive, canonicalName] = getMagicWordInfo(name, parserFunction),
				isFunc = !('functionHook' in config) || functionHook.includes(canonicalName as string),
				isVar = variable.includes(canonicalName as string);
			if (isFunction ? canonicalName && isFunc : isVar) {
				this.setAttribute('name', canonicalName as string);
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
				throw new SyntaxError(invalidTemplateMsg);
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
			if (!(
				templateLike
				|| this.name === 'switch' && j > 0
				|| this.name === 'tag' && j > 1
			)) {
				part[0] = part.join('=');
				part.length = 1;
			}
			if (part.length === 1) {
				(part as (number | string)[]).unshift(i);
				i++;
			}
			// @ts-expect-error abstract class
			this.insertAt(new ParameterToken(...part, config, accum) as ParameterToken);
		}
	}

	/**
	 * Set the transclusion modifier
	 *
	 * 设置引用修饰符
	 * @param modifier transclusion modifier / 引用修饰符
	 */
	setModifier(modifier: string): boolean {
		const [,, raw, subst] = this.getAttribute('config').parserFunction,
			lcModifier = removeComment(modifier).trim();
		if (modifier && !lcModifier.endsWith(':')) {
			return false;
		}
		const magicWord = lcModifier.slice(0, -1).toLowerCase(),
			isRaw = raw.includes(magicWord),
			isSubst = subst.includes(magicWord);
		if (
			(this.#raw ? isRaw : isSubst || !modifier)
			|| (Shadow.running || this.length > 1) && (
				isRaw || isSubst || !modifier
			)
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
		return this.type === 'template'
			|| this.name === 'invoke';
	}

	/** 获取模板或模块名 */
	#getTitle(): Title {
		const isTemplate = this.type === 'template',
			title = this.normalizeTitle(
				(isTemplate ? '' : 'Module:')
				+ removeComment(
					this.childNodes[
						isTemplate ?
							0
							: 1
					].text(),
				),
				10,
				{temporary: true, ...!isTemplate && {page: ''}},
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
		const {
			childNodes,
			length,
			firstChild,
			modifier,
			type,
			name,
		} = this;
		if (type === 'magic-word' && name === 'vardefine') {
			return '';
		}
		const delimiter = type === 'magic-word' ? this.#colon : '|';
		return `{{${modifier.trim().toLowerCase()}${firstChild.text().trim()}${length === 1 ? '' : delimiter}${
			childNodes.slice(1).map(child => {
				const str = child.text();
				return child.type === 'parameter' ? str : str.trim();
			}).join('|')
		}}}`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		switch (key) {
			case 'title':
				return this.#title as TokenAttribute<T>;
			case 'colon':
				return this.#colon as TokenAttribute<T>;

				/* NOT FOR BROWSER */

			case 'keys':
				return this.#keys as TokenAttribute<T>;

				/* NOT FOR BROWSER END */

			default:
				return super.getAttribute(key);
		}
	}

	/**
	 * 处理匿名参数更改
	 * @param addedToken 新增的参数
	 * @param append 是否在末尾新增参数
	 */
	#handleAnonArgChange(addedToken: ParameterToken, append?: boolean): void;
	#handleAnonArgChange(addedToken: number): void;
	#handleAnonArgChange(addedToken: number | ParameterToken, append?: boolean): void {
		/* NOT FOR BROWSER */

		const removing = typeof addedToken === 'number';

		/* NOT FOR BROWSER END */

		this.#anonCount +=
			removing ?
				-1 :
				1;

		/* NOT FOR BROWSER */

		const maxAnon = String(this.#anonCount + (removing ? 1 : 0));
		if (!removing) {
			this.#keys.add(maxAnon);
		} else if (!this.hasArg(maxAnon, true)) {
			this.#keys.delete(maxAnon);
		}
		let args: ParameterToken[];

		/* NOT FOR BROWSER END */

		let i: number;
		if (append) {
			i = this.#anonCount - 1;

			/* NOT FOR BROWSER */
		} else {
			args = this.getAnonArgs();
			i = removing ? addedToken - 1 : args.indexOf(addedToken);
		}
		for (; i < this.#anonCount; i++) {
			/* NOT FOR BROWSER END */

			const token =
					/* eslint-disable unicorn/no-negated-condition */
					!append ?
						args![i]! :
						addedToken as ParameterToken,
				/* eslint-enable unicorn/no-negated-condition */
				{name} = token,
				newName = String(i + 1);
			if (name === newName && token !== addedToken) {
				continue;
			}
			token.setAttribute('name', newName);
			this.getArgs(newName, false, false).add(token);

			/* NOT FOR BROWSER */

			if (name && token !== addedToken) {
				this.getArgs(name, false, false).delete(token);
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
			this.#handleAnonArgChange(
				token,
				i === this.length - 1,
			);
		} else if (token.name) {
			this.getArgs(token.name, false, false).add(token);

			/* NOT FOR BROWSER */

			this.#keys.add(token.name);
		}
		return token;
	}

	/**
	 * Get parameters with the specified name
	 *
	 * 获取指定参数
	 * @param key parameter name / 参数名
	 * @param exact whether to match anonymosity / 是否匹配匿名性
	 * @param copy whether to return a copy / 是否返回一个备份
	 * @param init whether to initialize during parsing / 是否在解析时进行初始化
	 */
	getArgs(key: string | number, exact?: boolean, copy = true, init = true): Set<ParameterToken> {
		const keyStr = String(key)
			.replace(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');
		let args: Set<ParameterToken>;
		if (this.#args.has(keyStr)) {
			args = this.#args.get(keyStr)!;
		} else {
			args = new Set(
				init ? [] : this.getAllArgs().filter(({name}) => keyStr === name),
			);
			this.#args.set(keyStr, args);
		}

		/* NOT FOR BROWSER */

		if (exact && keyStr.trim() && Number.isSafeInteger(Number(keyStr))) {
			args = new Set([...args].filter(({anon}) => typeof key === 'number' === anon));
		}

		/* NOT FOR BROWSER END */

		if (copy) {
			args = new Set(sortArgs(this, args));
		}
		return args;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [first, ...cloned] = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new TranscludeToken(
				this.type === 'template' ? 'T' : first!.text() + (cloned.length === 0 ? '' : this.#colon),
				[],
				this.getAttribute('config'),
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
	 * Get all parameters
	 *
	 * 获取所有参数
	 */
	getAllArgs(): ParameterToken[] {
		const {childNodes} = this,
			i = childNodes.findIndex(({type}) => type === 'parameter');
		return i === -1 ? [] : childNodes.slice(i) as ParameterToken[];
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
	 * Check if there is a parameter with the specified name
	 *
	 * 是否具有某参数
	 * @param key parameter name / 参数名
	 * @param exact whether to match anonymosity / 是否匹配匿名性
	 */
	hasArg(key: string | number, exact?: boolean): boolean {
		return this.getArgs(key, exact, false, false).size > 0;
	}

	/**
	 * Get the effective parameter with the specified name
	 *
	 * 获取生效的指定参数
	 * @param key parameter name / 参数名
	 */
	getArg(
		key: string | number,
	): ParameterToken | undefined {
		const args = [
			...this.getArgs(
				key,
			),
		];
		return args[args.length - 1];
	}

	/**
	 * Get the effective parameter value
	 *
	 * 获取生效的参数值
	 * @param key parameter name / 参数名
	 */
	getValue(key: string): string | undefined {
		return this.getArg(key)?.getValue();
	}

	/** @ignore */
	#toHtmlOrPlain(opt?: Omit<HtmlOpt, 'nocc'>): [string, true?] {
		const {type, name} = this;
		if (type === 'template' && !name.startsWith('Special:')) {
			if (this.normalizeTitle(name, 0, {halfParsed: true, temporary: true}).valid) {
				return [name.replaceAll('_', ' '), true];
			}
			const str = this.text();
			return [opt?.nowrap ? str.replaceAll('\n', ' ') : str];
		}
		return [''];
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		const [title, missing] = this.#toHtmlOrPlain(opt);
		return missing
			? `<a href="${this.#title.getUrl()}?action=edit&redlink=1" class="new" title="${
				sanitizeId(title)
			} (page does not exist)">${title}</a>`
			: title;
	}
}
