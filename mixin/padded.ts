import {mixin} from '../util/debug';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

/**
 * 给定 padding 的类
 * @param padding padding 字符串
 * @param padding.length
 */
export const padded = ({length}: string) => <S extends AstConstructor>(constructor: S): S => {
	/** 不可增删子节点的类 */
	abstract class PaddedToken extends constructor {
		override getAttribute<T extends string>(key: T): TokenAttribute<T> {
			return key === 'padding' ? length as TokenAttribute<T> : super.getAttribute(key);
		}
	}
	mixin(PaddedToken, constructor);
	return PaddedToken;
};

mixins['padded'] = __filename;
