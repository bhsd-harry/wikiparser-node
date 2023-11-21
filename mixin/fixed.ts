import * as Parser from '../index';
import type {AstNodes, AstText} from '../internal';

/**
 * 不可增删子节点的类
 * @param constructor 基类
 */
export const fixed = <S extends AstConstructor>(constructor: S) => {
	/** 不可增删子节点的类 */
	abstract class FixedToken extends constructor {
		static readonly fixed = true;

		/**
		 * @override
		 * @throws `Error` 不可用
		 */
		removeAt(): never {
			throw new Error(`${this.constructor.name} 不可删除元素！`);
		}

		/**
		 * @override
		 * @param token 待插入的子节点
		 * @param i 插入位置
		 * @throws `Error` 不可用
		 */
		override insertAt(token: string, i?: number): AstText;
		/** @ignore */
		override insertAt<T extends AstNodes>(token: T, i?: number): T;
		/** @ignore */
		override insertAt<T extends AstNodes>(token: T | string, i = this.length): T | AstText {
			if (Parser.running) {
				return super.insertAt(token, i) as T | AstText;
			}
			throw new Error(`${this.constructor.name} 不可插入元素！`);
		}
	}
	return FixedToken;
};

Parser.mixins['fixed'] = __filename;
