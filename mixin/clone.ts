import {Shadow} from '../util/debug';
import {mixins} from '../util/constants';
import type {Token} from '../internal';

/**
 * 深拷贝节点
 * @param method 方法
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const clone = (method: (this: Token) => Token) => function(this: Token): any {
	const cloned = this.cloneChildNodes();
	return Shadow.run(() => {
		const newToken = method.call(this);
		newToken.safeAppend(cloned);
		return newToken;
	});
};

mixins['clone'] = __filename;
