import {toLowerCase} from '../util/string';
import {gapped} from '../mixin/gapped';
import {Token} from './index';
import {AtomToken} from './atom';
import type {Config} from '../base';
import type {ConverterToken, ConverterRuleToken} from '../internal';

/* NOT FOR BROWSER */

import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

const definedFlags = new Set(['A', 'T', 'R', 'D', '-', 'H', 'N']);

/**
 * flags for language conversion
 *
 * 转换flags
 * @classdesc `{childNodes: AtomToken[]}`
 */
@gapped()
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

	/* NOT FOR BROWSER END */

	override get type(): 'converter-flags' {
		return 'converter-flags';
	}

	/** @param flags 转换类型标记 */
	constructor(flags: readonly string[], config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		this.safeAppend(flags.map(flag => new AtomToken(flag, 'converter-flag', config, accum)));
	}

	/** 获取全部转换类型标记 */
	#getFlags(): string[] {
		return this.childNodes.map(child => child.text().trim());
	}

	/** @private */
	override afterBuild(): void {
		this.#flags = this.#getFlags();
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, ';');
	}

	/** @private */
	override text(): string {
		return (this.#flags ?? this.#getFlags()).join(';');
	}

	/**
	 * Get unknown language conversion flags
	 *
	 * 获取未知的转换类型标记
	 */
	getUnknownFlags(): Set<string> {
		return new Set(this.#flags!.filter(flag => /\{{3}[^{}]+\}{3}/u.test(flag)));
	}

	/**
	 * Get language coversion flags that specify a language variant
	 *
	 * 获取指定语言变体的转换标记
	 */
	getVariantFlags(): Set<string> {
		const variants = new Set(toLowerCase(this.getAttribute('config').variants));
		return new Set(toLowerCase(this.#flags!).filter(flag => variants.has(flag)));
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new ConverterFlagsToken([], this.getAttribute('config'));
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt<T extends AtomToken>(token: T, i = this.length): T {
		super.insertAt(token, i);
		this.#flags?.splice(i, 0, token.text().trim());
		return token;
	}

	/**
	 * Get all language conversion flags
	 *
	 * 获取所有转换类型标记
	 */
	getAllFlags(): Set<string> {
		return new Set(this.#flags);
	}

	/**
	 * Get effective language conversion flags
	 *
	 * 获取有效的转换类型标记
	 */
	getEffectiveFlags(): Set<string> {
		const variantFlags = this.getVariantFlags(),
			unknownFlags = this.getUnknownFlags();
		const flags = new Set([...[...this.getAllFlags()].filter(flag => definedFlags.has(flag)), ...unknownFlags]);
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
			return new Set([
				'+',
				'H',
				...hasT ? ['T'] : [],
				...hasD ? ['D'] : [],
				...hasT && hasD ? [] : unknownFlags,
			]);
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
}
