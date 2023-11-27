import type {ConverterFlagsToken} from '../src/converterFlags';

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
