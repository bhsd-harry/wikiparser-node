import {mixin} from '../util/debug';

/**
 * 给定 padding 的类
 * @param padding
 */
export const padded = (padding: number) => <S extends AstConstructor>(constructor: S): S => {
	/** 不可增删子节点的类 */
	abstract class PaddedToken extends constructor {
		/** @private */
		override getAttribute<T extends string>(key: T): TokenAttribute<T> {
			return key === 'padding' ? padding as TokenAttribute<T> : super.getAttribute(key);
		}
	}
	mixin(PaddedToken, constructor);
	return PaddedToken;
};
