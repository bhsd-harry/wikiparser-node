import {Shadow} from '../util/debug';
import {mixins} from '../util/constants';
import type {Token} from '../internal';

/**
 * 深拷贝节点
 * @param method 方法
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const clone = (method: (this: Token) => Token) => function(this: Token): any {
	const cloned = this.cloneChildNodes(),
		{type, name} = this;
	return Shadow.run(() => {
		const newToken = method.call(this);
		newToken.safeAppend(cloned);
		if (type === 'ext-inner' && name) {
			newToken.setAttribute('name', name);
		}
		return newToken;
	});
};

mixins['clone'] = __filename;
