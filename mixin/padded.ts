import {mixin} from '../util/debug';

/**
 * 给定 padding 的类
 * @param padding padding 字符串
 * @param padding.length
 */
export const padded = ({length}: string) => <S extends AstConstructor>(constructor: S): S => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class PaddedToken extends constructor {
		override getAttribute<T extends string>(key: T): TokenAttribute<T> {
			return key === 'padding' ? length as TokenAttribute<T> : super.getAttribute(key);
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	mixin(PaddedToken, constructor);
	return PaddedToken;
};
