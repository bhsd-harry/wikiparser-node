import type {AttributesToken} from '../internal';

/* NOT FOR BROWSER ONLY */

import {mixin} from '../util/debug';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import type {ClassList} from '../lib/classList';

/* NOT FOR BROWSER END */

export interface AttributesParentBase {

	/* NOT FOR BROWSER */

	/** class attribute in Set / 以Set表示的class属性 */
	readonly classList: ClassList;

	/** id attribute / id属性 */
	id: string;

	/* NOT FOR BROWSER END */

	/**
	 * Check if the token has a certain attribute
	 *
	 * 是否具有某属性
	 * @param key attribute name / 属性键
	 */
	hasAttr(key: string): boolean;

	/**
	 * Get the attribute
	 *
	 * 获取指定属性
	 * @param key attribute name / 属性键
	 */
	getAttr(key: string): string | undefined;

	/* NOT FOR BROWSER */

	/**
	 * Set the attribute
	 *
	 * 设置指定属性
	 * @param key attribute name / 属性键
	 * @param value attribute value / 属性值
	 */
	setAttr(key: string, value: string): void;
}

/**
 * 子节点含有AttributesToken的类
 * @param i AttributesToken子节点的位置
 */
export const attributesParent = (i = 0) => <T extends AstConstructor>(constructor: T): T => {
	abstract class AttributesParent extends constructor implements AttributesParentBase {
		/* NOT FOR BROWSER */

		get classList(): ClassList {
			return this.#getAttributesChild().classList;
		}

		get id(): string {
			return this.#getAttributesChild().id;
		}

		/* NOT FOR BROWSER END */

		/** AttributesToken子节点 */
		#getAttributesChild(): AttributesToken {
			return this.childNodes[i] as AttributesToken;
		}

		hasAttr(key: string): boolean {
			return this.#getAttributesChild().hasAttr(key);
		}

		getAttr(key: string): string | undefined {
			return this.#getAttributesChild().getAttr(key);
		}

		/* NOT FOR BROWSER */

		setAttr(key: string, value: string): void {
			this.#getAttributesChild().setAttr(key, value);
		}
	}

	/* NOT FOR BROWSER ONLY */

	mixin(AttributesParent, constructor);

	/* NOT FOR BROWSER ONLY END */

	return AttributesParent;
};
