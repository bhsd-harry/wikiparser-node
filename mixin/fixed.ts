import {Shadow} from '../util/debug';
import {mixins} from '../util/constants';
import type {AstNodes, AstText} from '../internal';

/**
 * 不可增删子节点的类
 * @param constructor 基类
 */
export const fixed = <S extends AstConstructor>(constructor: S) => {
	/** 不可增删子节点的类 */
	abstract class FixedToken extends constructor {
		static readonly fixed = true;

		/** @override */
		removeAt(): never {
			this.constructorError('不可删除元素');
		}

		/**
		 * @override
		 * @param token 待插入的子节点
		 * @param i 插入位置
		 */
		override insertAt(token: string, i?: number): AstText;
		/** @ignore */
		override insertAt<T extends AstNodes>(token: T, i?: number): T;
		/** @ignore */
		override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
			return Shadow.running ? super.insertAt(token, i) as T | AstText : this.constructorError('不可插入元素');
		}
	}
	return FixedToken;
};

mixins['fixed'] = __filename;
