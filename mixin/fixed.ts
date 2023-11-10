import {Parser} from '../index';
import type {AstNodeTypes, AstText} from '../internal';

/**
 * 不可增删子节点的类
 * @param constructor 基类
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const fixed = <S extends AstConstructor>(constructor: S) => {
	/** 不可增删子节点的类 */
	abstract class FixedToken extends constructor {
		static readonly fixed = true;

		/**
		 * @override
		 * @throws `Error`
		 */
		removeAt(): never {
			throw new Error(`${this.constructor.name} 不可删除元素！`);
		}

		/**
		 * @override
		 * @param token 待插入的子节点
		 * @param i 插入位置
		 * @throws `Error`
		 */
		override insertAt(token: string, i?: number): AstText;
		/** @ignore */
		override insertAt<T extends AstNodeTypes>(token: T, i?: number): T;
		/** @ignore */
		override insertAt<T extends AstNodeTypes>(token: T | string, i = this.length): T | AstText {
			if (Parser.running) {
				return super.insertAt(token, i) as T | AstText;
			}
			throw new Error(`${this.constructor.name} 不可插入元素！`);
		}
	}
	return FixedToken;
};

Parser.mixins['fixed'] = __filename;
