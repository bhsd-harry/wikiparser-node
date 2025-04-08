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
	 * Get the attribute
	 *
	 * 获取指定属性
	 * @param key attribute name / 属性键
	 */
	getAttr(key: string): string | true | undefined;

	/* NOT FOR BROWSER */

	/**
	 * Check if the token has a certain attribute
	 *
	 * 是否具有某属性
	 * @param key attribute name / 属性键
	 */
	hasAttr(key: string): boolean;

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
	/** 子节点含有AttributesToken的类 */
	abstract class AttributesParent extends constructor {
		/* NOT FOR BROWSER */

		/** @implements */
		get attributes(): Record<string, string | true> {
			return this.#getAttributesChild().attributes;
		}

		set attributes(attributes) {
			this.#getAttributesChild().attributes = attributes;
		}

		/** @implements */
		get className(): string {
			return this.#getAttributesChild().className;
		}

		set className(className) {
			this.#getAttributesChild().className = className;
		}

		/** @implements */
		get classList(): Set<string> {
			return this.#getAttributesChild().classList;
		}

		/** @implements */
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

		/** @implements */
		getAttr(key: string): string | true | undefined {
			return this.#getAttributesChild().getAttr(key);
		}

		/* NOT FOR BROWSER */

		/** @implements */
		hasAttr(key: string): boolean {
			return this.#getAttributesChild().hasAttr(key);
		}

		/** @implements */
		getAttrNames(): Set<string> {
			return this.#getAttributesChild().getAttrNames();
		}

		/** @implements */
		getAttrs(): Record<string, string | true> {
			return this.#getAttributesChild().getAttrs();
		}

		/** @implements */
		setAttr(key: string, value: string | boolean): void;
		setAttr(prop: Record<string, string | boolean>): void;
		setAttr(keyOrProp: string | Record<string, string | boolean>, value?: string | boolean): void {
			this.#getAttributesChild().setAttr(keyOrProp as string, value!);
		}

		/** @implements */
		removeAttr(key: string): void {
			this.#getAttributesChild().removeAttr(key);
		}

		/** @implements */
		toggleAttr(key: string, force?: boolean): void {
			this.#getAttributesChild().toggleAttr(key, force);
		}

		/** @implements */
		css(key: string, value?: string): string | undefined {
			return this.#getAttributesChild().css(key, value);
		}
	}
	mixin(AttributesParent, constructor);
	return AttributesParent;
};

mixins['attributesParent'] = __filename;
