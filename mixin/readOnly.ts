import {Shadow} from '../util/debug';
import {mixins} from '../util/constants';
import Parser from '../index';

/**
 * 只读或可写的方法
 * @param readonly 是否只读
 */
export const readOnly = (readonly = false) =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(method: Function) => function(this: unknown, ...args: unknown[]): any {
		const {viewOnly} = Parser;
		if (!Shadow.running) {
			Parser.viewOnly = readonly;
		}
		try {
			return method.apply(this, args);
		} finally {
			if (!Shadow.running) {
				Parser.viewOnly = viewOnly;
			}
		}
	};

mixins['readOnly'] = __filename;
