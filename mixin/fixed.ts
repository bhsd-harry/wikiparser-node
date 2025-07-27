import {Shadow, mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {AstNodes, AstText} from '../internal';

/**
 * 不可增删子节点的类
 * @ignore
 */
export const fixedToken = <S extends AstConstructor>(constructor: S): S => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class FixedToken extends constructor {
		get fixed(): true {
			return true;
		}

		removeAt(): never {
			this.constructorError('cannot remove child nodes');
		}

		override insertAt(token: string, i?: number): AstText;
		override insertAt<T extends AstNodes>(token: T, i?: number): T;
		override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
			return Shadow.running
				? super.insertAt(token, i) as T | AstText
				: this.constructorError('cannot insert child nodes');
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	mixin(FixedToken, constructor);
	return FixedToken;
};

mixins['fixedToken'] = __filename;
