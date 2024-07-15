import {generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {LintError} from '../base';
import type {ConverterToken, ConverterRuleToken} from '../internal';

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
export abstract class ConverterFlagsToken extends Token {
	#flags?: string[];

	declare readonly childNodes: readonly AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get parentNode(): ConverterToken | undefined;
	abstract override get previousSibling(): undefined;
	abstract override get nextSibling(): ConverterRuleToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): AtomToken[];
	abstract override get firstElementChild(): AtomToken | undefined;
	abstract override get lastElementChild(): AtomToken | undefined;
	abstract override get parentElement(): ConverterToken | undefined;
	abstract override get previousElementSibling(): undefined;
	abstract override get nextElementSibling(): ConverterRuleToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'converter-flags' {
		return 'converter-flags';
	}

	/* NOT FOR BROWSER */

	/** 所有转换类型标记 */
	get flags(): Set<string> {
		return this.getAllFlags();
	}

	set flags(value) {
		this.replaceChildren();
		for (const flag of value) {
			this.#newFlag(flag);
		}
	}

	/* NOT FOR BROWSER END */

	/** @param flags 转换类型标记 */
	constructor(flags: readonly string[], config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
			AtomToken: ':',
		});
		this.append(...flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** @private */
	override afterBuild(): void {
		this.#flags = this.childNodes.map(child => child.text().trim());
		super.afterBuild();

		/* NOT FOR BROWSER */

		const /** @implements */ converterFlagsListener: AstListener = ({prevTarget}) => {
			if (prevTarget) {
				this.#flags![this.childNodes.indexOf(prevTarget as AtomToken)] = prevTarget.text().trim();
			}
		};
		this.addEventListener(['remove', 'insert', 'text', 'replace'], converterFlagsListener);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, ';');
	}

	/** @private */
	override text(): string {
		return super.text(';');
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** 获取未知的转换类型标记 */
	getUnknownFlags(): Set<string> {
		return new Set(this.#flags!.filter(flag => /\{{3}[^{}]+\}{3}/u.test(flag)));
	}

	/** 获取指定语言变体的转换标记 */
	getVariantFlags(): Set<string> {
		const variants = new Set(this.getAttribute('config').variants);
		return new Set(this.#flags!.filter(flag => variants.has(flag)));
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags(),
			validFlags = new Set(this.#flags!.filter(flag => definedFlags.has(flag))),
			emptyFlagCount = this.#flags!.filter(flag => !flag).length,
			knownFlagCount = this.#flags!.length - unknownFlags.size - emptyFlagCount,
			errors = super.lint(start, re);
		if (variantFlags.size === knownFlagCount || validFlags.size === knownFlagCount) {
			return errors;
		}
		const rect = new BoundingRect(this, start);
		for (const [i, child] of this.childNodes.entries()) {
			const flag = child.text().trim();
			if (
				flag
				&& !variantFlags.has(flag)
				&& !unknownFlags.has(flag)
				&& (variantFlags.size > 0 || !validFlags.has(flag))
			) {
				const e = generateForChild(child, rect, 'no-ignored', 'invalid conversion flag');
				if (variantFlags.size === 0 && definedFlags.has(flag.toUpperCase())) {
					e.fix = {range: [e.startIndex, e.endIndex], text: flag.toUpperCase()};
				} else {
					e.suggestions = [
						{
							desc: 'remove',
							range: [e.startIndex - (i && 1), e.endIndex],
							text: '',
						},
					];
				}
				errors.push(e);
			}
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print({sep: ';'});
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ConverterFlagsToken([], this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
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
	getFlagTokens(flag: string): AtomToken[] {
		return this.#flags!.includes(flag) ? this.childNodes.filter(child => child.text().trim() === flag) : [];
	}

	/** 获取有效的转换类型标记 */
	getEffectiveFlags(): Set<string> {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags();
		const flags = new Set([...this.#flags!.filter(flag => definedFlags.has(flag)), ...unknownFlags]);
		if (flags.size === 0 && variantFlags.size === 0) {
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
		} else if (variantFlags.size > 0) {
			return new Set([...variantFlags, ...unknownFlags]);
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
		for (const token of this.getFlagTokens(flag)) {
			token.remove();
		}
	}

	/**
	 * 添加转换类型标记
	 * @param flag 转换类型标记
	 */
	#newFlag(flag: string): void {
		this.insertAt(Shadow.run(() => new AtomToken(flag, 'converter-flag', this.getAttribute('config'))));
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

classes['ConverterFlagsToken'] = __filename;
