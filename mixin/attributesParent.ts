import {mixin} from '../util/debug';
import type {AstNodes, AttributesToken} from '../internal';

export interface AttributesParentBase {

	/**
	 * 获取AttributesToken子节点的属性
	 * @param key 属性键
	 */
	getAttr(key: string): string | true | undefined;
}

/**
 * 子节点含有AttributesToken的类
 * @param i AttributesToken子节点的位置
 * @param constructor 基类
 * @param _ context
 */
export const attributesParent = (i = 0) => <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 子节点含有AttributesToken的类 */
	abstract class AttributesParent extends constructor {
		declare readonly childNodes: readonly AstNodes[];

		/** AttributesToken子节点 */
		get #attributesChild(): AttributesToken {
			return this.childNodes[i] as AttributesToken;
		}

		/** @implements */
		getAttr(key: string): string | true | undefined {
			return this.#attributesChild.getAttr(key);
		}
	}
	mixin(AttributesParent, constructor);
	return AttributesParent;
};
