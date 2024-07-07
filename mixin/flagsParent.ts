import {mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {ConverterFlagsToken} from '../src/converterFlags';

/* NOT FOR BROWSER */

export interface FlagsParentBase {

	/** 所有转换类型标记 */
	flags: Set<string>;

	/** 获取所有转换类型标记 */
	getAllFlags(): Set<string>;

	/** 获取有效的转换类型标记 */
	getEffectiveFlags(): Set<string>;

	/** 获取未知的转换类型标记 */
	getUnknownFlags(): Set<string>;

	/** 获取指定语言变体的转换标记 */
	getVariantFlags(): Set<string>;

	/**
	 * 是否具有某转换类型标记
	 * @param flag 转换类型标记
	 */
	hasFlag(flag: string): boolean;

	/**
	 * 是否具有某有效的转换类型标记
	 * @param flag 转换类型标记
	 */
	hasEffectiveFlag(flag: string): boolean;

	/**
	 * 移除转换类型标记
	 * @param flag 转换类型标记
	 */
	removeFlag(flag: string): void;

	/**
	 * 设置转换类型标记
	 * @param flag 转换类型标记
	 */
	setFlag(flag: string): void;

	/**
	 * 开关某转换类型标记
	 * @param flag 转换类型标记
	 */
	toggleFlag(flag: string): void;
}

/* NOT FOR BROWSER END */

/**
 * ConverterToken
 * @param constructor 基类
 * @param _ context
 */
export const flagsParent = <T extends AstConstructor>(constructor: T, _?: unknown) => {
	/** 子节点含有ConverterFlagsToken的类 */
	abstract class FlagsParent extends constructor {
		abstract get firstChild(): ConverterFlagsToken;
		abstract get firstElementChild(): ConverterFlagsToken;

		/* NOT FOR BROWSER */

		/** @implements */
		get flags(): Set<string> {
			return this.firstChild.flags;
		}

		set flags(value) {
			this.firstChild.flags = value;
		}

		/** @implements */
		getAllFlags(): Set<string> {
			return this.firstChild.getAllFlags();
		}

		/** @implements */
		getEffectiveFlags(): Set<string> {
			return this.firstChild.getEffectiveFlags();
		}

		/** @implements */
		getUnknownFlags(): Set<string> {
			return this.firstChild.getUnknownFlags();
		}

		/** @implements */
		getVariantFlags(): Set<string> {
			return this.firstChild.getVariantFlags();
		}

		/** @implements */
		hasFlag(flag: string): boolean {
			return this.firstChild.hasFlag(flag);
		}

		/** @implements */
		hasEffectiveFlag(flag: string): boolean {
			return this.firstChild.hasEffectiveFlag(flag);
		}

		/** @implements */
		removeFlag(flag: string): void {
			this.firstChild.removeFlag(flag);
		}

		/** @implements */
		setFlag(flag: string): void {
			this.firstChild.setFlag(flag);
		}

		/** @implements */
		toggleFlag(flag: string): void {
			this.firstChild.toggleFlag(flag);
		}
	}
	mixin(FlagsParent, constructor);
	return FlagsParent;
};

mixins['flagsParent'] = __filename;
