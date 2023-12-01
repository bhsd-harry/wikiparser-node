import {Shadow} from '../util/debug';
import type {ConverterFlagsToken} from '../src/converterFlags';

/**
 * ConverterToken
 * @param constructor 基类
 */
export const flagsParent = <T extends AstConstructor>(constructor: T) => {
	/** 子节点含有ConverterFlagsToken的类 */
	abstract class FlagsParent extends constructor {
		abstract get firstChild(): ConverterFlagsToken;
		abstract get firstElementChild(): ConverterFlagsToken;

		/** 所有转换类型标记 */
		get flags(): Set<string> {
			return this.firstChild.flags;
		}

		set flags(value) {
			this.firstChild.flags = value;
		}

		/** 获取所有转换类型标记 */
		getAllFlags(): Set<string> {
			return this.firstChild.getAllFlags();
		}

		/** 获取有效的转换类型标记 */
		getEffectiveFlags(): Set<string> {
			return this.firstChild.getEffectiveFlags();
		}

		/** 获取未知的转换类型标记 */
		getUnknownFlags(): Set<string> {
			return this.firstChild.getUnknownFlags();
		}

		/**
		 * 是否具有某转换类型标记
		 * @param flag 转换类型标记
		 */
		hasFlag(flag: string): boolean {
			return this.firstChild.hasFlag(flag);
		}

		/**
		 * 是否具有某有效的转换类型标记
		 * @param flag 转换类型标记
		 */
		hasEffectiveFlag(flag: string): boolean {
			return this.firstChild.hasEffectiveFlag(flag);
		}

		/**
		 * 移除转换类型标记
		 * @param flag 转换类型标记
		 */
		removeFlag(flag: string): void {
			this.firstChild.removeFlag(flag);
		}

		/**
		 * 设置转换类型标记
		 * @param flag 转换类型标记
		 */
		setFlag(flag: string): void {
			this.firstChild.setFlag(flag);
		}

		/**
		 * 开关某转换类型标记
		 * @param flag 转换类型标记
		 */
		toggleFlag(flag: string): void {
			this.firstChild.toggleFlag(flag);
		}
	}
	return FlagsParent;
};

Shadow.mixins['flagsParent'] = __filename;
