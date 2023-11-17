import {generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from '.';
import {AtomToken} from './atom';
import type {LintError} from '../index';
import type {ConverterToken, ConverterRuleToken} from '../internal';

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
export abstract class ConverterFlagsToken extends Token {
	/** @browser */
	override readonly type = 'converter-flags';
	declare childNodes: AtomToken[];
	abstract override get children(): AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get firstElementChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get lastElementChild(): AtomToken | undefined;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get parentElement(): ConverterToken | undefined;
	abstract override get previousSibling(): undefined;
	abstract override get previousElementSibling(): undefined;
	abstract override get nextSibling(): ConverterRuleToken | undefined;
	abstract override get nextElementSibling(): ConverterRuleToken | undefined;

	/** @browser */
	#flags?: string[];

	/**
	 * @browser
	 * @param flags 转换类型标记
	 */
	constructor(flags: string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum, {
			AtomToken: ':',
		});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** @private */
	protected override afterBuild(): void {
		this.#flags = this.childNodes.map(child => child.text().trim());
		const /** @implements */ converterFlagsListener: AstListener = ({prevTarget}) => {
			if (prevTarget) {
				this.#flags![this.childNodes.indexOf(prevTarget as AtomToken)] = prevTarget.text().trim();
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterFlagsListener);
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return super.toString(omit, ';');
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return super.text(';');
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i < this.length - 1 ? 1 : 0;
	}

	/**
	 * 获取未知的转换类型标记
	 * @browser
	 */
	getUnknownFlags(): Set<string> {
		return new Set(this.#flags!.filter(flag => /\{{3}[^{}]+\}{3}/u.test(flag)));
	}

	/**
	 * 获取指定语言变体的转换标记
	 * @browser
	 */
	getVariantFlags(): Set<string> {
		const variants = new Set(this.getAttribute('config').variants);
		return new Set(this.#flags!.filter(flag => variants.has(flag)));
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags(),
			validFlags = new Set(this.#flags!.filter(flag => definedFlags.has(flag))),
			{length: emptyFlagCount} = this.#flags!.filter(flag => !flag),
			knownFlagCount = this.#flags!.length - unknownFlags.size - emptyFlagCount,
			errors = super.lint(start);
		if (variantFlags.size === knownFlagCount || validFlags.size === knownFlagCount) {
			return errors;
		}
		const rect = {start, ...this.getRootNode().posFromIndex(start)},
			{childNodes, length} = this;
		for (let i = 0; i < length; i++) {
			const child = childNodes[i]!,
				flag = child.text().trim();
			if (flag && !variantFlags.has(flag) && !unknownFlags.has(flag)
				&& (variantFlags.size > 0 || !validFlags.has(flag))
			) {
				const error = generateForChild(child, rect, 'invalid conversion flag');
				errors.push({...error, excerpt: childNodes.slice(0, i + 1).map(String).join(';').slice(-50)});
			}
		}
		return errors;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({sep: ';'});
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ConverterFlagsToken([], this.getAttribute('config'));
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'flags' ? this.#flags as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	protected override hasAttribute(key: string): boolean {
		return key === 'flags' || super.hasAttribute(key);
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	override removeAt(i: number): AtomToken {
		const token = super.removeAt(i) as AtomToken;
		this.#flags?.splice(i, 1);
		return token;
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	override insertAt<T extends AtomToken>(token: T, i = this.length): T {
		super.insertAt(token, i);
		this.#flags?.splice(i, 0, token.text().trim());
		return token;
	}

	/** 获取所有转换类型标记 */
	getAllFlags(): Set<string> {
		return new Set(this.#flags);
	}

	/**
	 * 获取转换类型标记节点
	 * @param flag 转换类型标记
	 */
	getFlagToken(flag: string): AtomToken[] {
		return this.#flags!.includes(flag) ? this.childNodes.filter(child => child.text().trim() === flag) : [];
	}

	/** 获取有效的转换类型标记 */
	getEffectiveFlags(): Set<string> {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags();
		if (variantFlags.size > 0) {
			return new Set([...variantFlags, ...unknownFlags]);
		}
		const flags = new Set([...this.#flags!.filter(flag => definedFlags.has(flag)), ...unknownFlags]);
		if (flags.size === 0) {
			return new Set('S');
		} else if (flags.has('R')) {
			return new Set('R');
		} else if (flags.has('N')) {
			return new Set('N');
		} else if (flags.has('-')) {
			return new Set('-');
		} else if (flags.has('H')) {
			const hasT = flags.has('T'),
				hasD = flags.has('D');
			return hasT && hasD
				? new Set(['+', 'H', 'T', 'D'])
				: new Set(['+', 'H', ...hasT ? ['T'] : [], ...hasD ? ['D'] : [], ...unknownFlags]);
		}
		if (flags.size === 1 && flags.has('T')) {
			flags.add('H');
		}
		if (flags.has('A')) {
			flags.add('+');
			flags.add('S');
		}
		if (flags.has('D')) {
			flags.delete('S');
		}
		return flags;
	}

	/**
	 * 是否具有某转换类型标记
	 * @param flag 转换类型标记
	 */
	hasFlag(flag: string): boolean {
		return this.#flags!.includes(flag);
	}

	/**
	 * 是否具有某有效的转换类型标记
	 * @param flag 转换类型标记
	 */
	hasEffectiveFlag(flag: string): boolean {
		return this.getEffectiveFlags().has(flag);
	}

	/**
	 * 移除某转换类型标记
	 * @param flag 转换类型标记
	 */
	removeFlag(flag: string): void {
		for (const token of this.getFlagToken(flag)) {
			token.remove();
		}
	}

	/**
	 * 添加转换类型标记
	 * @param flag 转换类型标记
	 */
	#newFlag(flag: string): void {
		const token = Parser.run(() => new AtomToken(flag, 'converter-flag', this.getAttribute('config')));
		this.insertAt(token);
	}

	/**
	 * 设置转换类型标记
	 * @param flag 转换类型标记
	 */
	setFlag(flag: string): void {
		if (!this.#flags!.includes(flag)) {
			this.#newFlag(flag);
		}
	}

	/**
	 * 开关转换类型标记
	 * @param flag 转换类型标记
	 */
	toggleFlag(flag: string): void {
		if (this.#flags!.includes(flag)) {
			this.removeFlag(flag);
		} else {
			this.#newFlag(flag);
		}
	}
}

Parser.classes['ConverterFlagsToken'] = __filename;
