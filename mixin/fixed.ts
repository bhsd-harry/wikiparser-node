import {Shadow, mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {AstNodes, AstText} from '../internal';

/**
 * 不可增删子节点的类
 * @param constructor 基类
 * @param _ context
 */
export const fixedToken = <S extends AstConstructor>(constructor: S, _?: unknown): S => {
	/** 不可增删子节点的类 */
	abstract class FixedToken extends constructor {
		/** @private */
		get fixed(): true {
			return true;
		}

		/** @override */
		removeAt(): never {
			this.constructorError('cannot remove child nodes');
		}

		/**
		 * @override
		 * @param token 待插入的子节点
		 * @param i 插入位置
		 */
		override insertAt(token: string, i?: number): AstText;
		override insertAt<T extends AstNodes>(token: T, i?: number): T;
		override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
			return Shadow.running
				? super.insertAt(token, i) as T | AstText
				: this.constructorError('cannot insert child nodes');
		}
	}
	mixin(FixedToken, constructor);
	return FixedToken;
};

mixins['fixedToken'] = __filename;
