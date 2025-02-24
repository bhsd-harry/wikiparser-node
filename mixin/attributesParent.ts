import {mixin} from '../util/debug';
import type {AttributesToken} from '../internal';

export interface AttributesParentBase {

	/**
	 * Get the attribute
	 *
	 * 获取指定属性
	 * @param key attribute name / 属性键
	 */
	getAttr(key: string): string | true | undefined;
}

/**
 * 子节点含有AttributesToken的类
 * @param i AttributesToken子节点的位置
 */
export const attributesParent = (i = 0) => <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 子节点含有AttributesToken的类 */
	abstract class AttributesParent extends constructor {
		/** AttributesToken子节点 */
		#getAttributesChild(): AttributesToken {
			return this.childNodes[i] as AttributesToken;
		}

		/** @implements */
		getAttr(key: string): string | true | undefined {
			return this.#getAttributesChild().getAttr(key);
		}
	}
	mixin(AttributesParent, constructor);
	return AttributesParent;
};
