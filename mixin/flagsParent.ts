import type {ConverterFlagsToken} from '../src/converterFlags';

export interface FlagsParentBase {
	flags: Set<string>;
	getAllFlags(): Set<string>;
	getEffectiveFlags(): Set<string>;
	getUnknownFlags(): Set<string>;
	hasFlag(flag: string): boolean;
	hasEffectiveFlag(flag: string): boolean;
	removeFlag(flag: string): void;
	setFlag(flag: string): void;
	toggleFlag(flag: string): void;
}

/**
 * ConverterToken
 * @param constructor 基类
 */
export const flagsParent = <T extends AstConstructor>(constructor: T) => {
	/** 子节点含有ConverterFlagsToken的类 */
	abstract class FlagsParent extends constructor {
		abstract get firstChild(): ConverterFlagsToken;
	}
	return FlagsParent;
};
