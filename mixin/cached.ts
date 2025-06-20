import {cache} from '../util/lint';
import type {Token} from '../internal';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

/**
 * 缓存计算结果
 * @param force 是否强制缓存
 */
export const cached = (force = true) =>
	(method: (this: Token, ...args: any[]) => unknown) => {
		const stores = new WeakMap<Token, [number, unknown]>();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return function(this: Token, ...args: unknown[]): any {
			return cache(
				stores.get(this),
				() => method.apply(this, args),
				value => {
					stores.set(this, value);
				},
				force,
			);
		};
	};

mixins['cached'] = __filename;
