import {mixin} from '../util/debug';
import type {AttributesToken} from '../internal';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

export interface AttributesParentBase {

	/* NOT FOR BROWSER */

	/** all attributes / 全部属性 */
	attributes: Record<string, string | true>;

	/** class attribute in string / 以字符串表示的class属性 */
	className: string;

	/** class attribute in Set / 以Set表示的class属性 */
	readonly classList: Set<string>;

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
	getAttr(key: string): string | true | undefined;

	/* NOT FOR BROWSER */

	/**
	 * Get all attribute names
	 *
	 * 获取全部的属性名
	 */
	getAttrNames(): Set<string>;

	/**
	 * Get all attributes
	 *
	 * 获取全部属性
	 */
	getAttrs(): Record<string, string | true>;

	/* eslint-disable jsdoc/check-param-names */
	/**
	 * Set the attribute
	 *
	 * 设置指定属性
	 * @param key attribute name / 属性键
	 * @param value attribute value / 属性值
	 * @param prop attribute object / 属性对象
	 */
	/* eslint-enable jsdoc/check-param-names */
	setAttr(key: string, value: string | boolean): void;
	setAttr(prop: Record<string, string | boolean>): void;

	/**
	 * Remove an attribute
	 *
	 * 移除指定属性
	 * @param key attribute name / 属性键
	 */
	removeAttr(key: string): void;

	/**
	 * Toggle the specified attribute
	 *
	 * 开关指定属性
	 * @param key attribute name / 属性键
	 * @param force whether to force enabling or disabling / 强制开启或关闭
	 */
	toggleAttr(key: string, force?: boolean): void;

	/**
	 * Get the value of a style property
	 *
	 * 获取某一样式属性的值
	 * @param key style property / 样式属性
	 * @param value style property value / 样式属性值
	 */
	css(key: string, value?: string): string | undefined;
}

/**
 * 子节点含有AttributesToken的类
 * @param i AttributesToken子节点的位置
 */
export const attributesParent = (i = 0) => <T extends AstConstructor>(constructor: T): T => {
	LINT: { // eslint-disable-line no-unused-labels
		/* eslint-disable jsdoc/require-jsdoc */
		abstract class AttributesParent extends constructor implements AttributesParentBase {
			/* NOT FOR BROWSER */

			get attributes(): Record<string, string | true> {
				return this.#getAttributesChild().attributes;
			}

			set attributes(attributes) {
				this.#getAttributesChild().attributes = attributes;
			}

			get className(): string {
				return this.#getAttributesChild().className;
			}

			set className(className) {
				this.#getAttributesChild().className = className;
			}

			get classList(): Set<string> {
				return this.#getAttributesChild().classList;
			}

			get id(): string {
				return this.#getAttributesChild().id;
			}

			set id(id) {
				this.#getAttributesChild().id = id;
			}

			/* NOT FOR BROWSER END */

			/** AttributesToken子节点 */
			#getAttributesChild(): AttributesToken {
				return this.childNodes[i] as AttributesToken;
			}

			hasAttr(key: string): boolean {
				LSP: return this.#getAttributesChild().hasAttr(key); // eslint-disable-line no-unused-labels
			}

			getAttr(key: string): string | true | undefined {
				return this.#getAttributesChild().getAttr(key);
			}

			/* NOT FOR BROWSER */

			getAttrNames(): Set<string> {
				return this.#getAttributesChild().getAttrNames();
			}

			getAttrs(): Record<string, string | true> {
				return this.#getAttributesChild().getAttrs();
			}

			setAttr(key: string, value: string | boolean): void;
			setAttr(prop: Record<string, string | boolean>): void;
			setAttr(keyOrProp: string | Record<string, string | boolean>, value?: string | boolean): void {
				this.#getAttributesChild().setAttr(keyOrProp as string, value!);
			}

			removeAttr(key: string): void {
				this.#getAttributesChild().removeAttr(key);
			}

			toggleAttr(key: string, force?: boolean): void {
				this.#getAttributesChild().toggleAttr(key, force);
			}

			css(key: string, value?: string): string | undefined {
				return this.#getAttributesChild().css(key, value);
			}
		}
		/* eslint-enable jsdoc/require-jsdoc */
		mixin(AttributesParent, constructor);
		return AttributesParent;
	}
};

mixins['attributesParent'] = __filename;
