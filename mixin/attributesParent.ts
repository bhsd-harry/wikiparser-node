import {mixin} from '../util/debug';
import type {AttributesToken} from '../internal';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

export interface AttributesParentBase {

	/* NOT FOR BROWSER */

	/** getAttrs()方法的getter写法 */
	attributes: Record<string, string | true>;

	/** 以字符串表示的class属性 */
	className: string;

	/** 以Set表示的class属性 */
	classList: Set<string>;

	/** id属性 */
	id: string;

	/* NOT FOR BROWSER END */

	/**
	 * 获取AttributesToken子节点的属性
	 * @param key 属性键
	 */
	getAttr(key: string): string | true | undefined;

	/* NOT FOR BROWSER */

	/**
	 * AttributesToken子节点是否具有某属性
	 * @param key 属性键
	 */
	hasAttr(key: string): boolean;

	/** 列举AttributesToken子节点的属性键 */
	getAttrNames(): Set<string>;

	/** 获取AttributesToken子节点的全部标签属性 */
	getAttrs(): Record<string, string | true>;

	/**
	 * 对AttributesToken子节点设置属性
	 * @param key 属性键
	 * @param value 属性值
	 * @param prop 属性对象
	 */
	setAttr(key: string, value: string | boolean): void;
	setAttr(prop: Record<string, string | boolean>): void;

	/**
	 * 移除AttributesToken子节点的某属性
	 * @param key 属性键
	 */
	removeAttr(key: string): void;

	/**
	 * 开关AttributesToken子节点的某属性
	 * @param key 属性键
	 * @param force 强制开启或关闭
	 */
	toggleAttr(key: string, force?: boolean): void;
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
		/** AttributesToken子节点 */
		get #attributesChild(): AttributesToken {
			return this.childNodes[i] as AttributesToken;
		}

		/* NOT FOR BROWSER */

		/** @implements */
		get attributes(): Record<string, string | true> {
			return this.#attributesChild.attributes;
		}

		set attributes(attributes) {
			this.#attributesChild.attributes = attributes;
		}

		/** @implements */
		get className(): string {
			return this.#attributesChild.className;
		}

		set className(className) {
			this.#attributesChild.className = className;
		}

		/** @implements */
		get classList(): Set<string> {
			return this.#attributesChild.classList;
		}

		/** @implements */
		get id(): string {
			return this.#attributesChild.id;
		}

		set id(id) {
			this.#attributesChild.id = id;
		}

		/* NOT FOR BROWSER END */

		/** @implements */
		getAttr(key: string): string | true | undefined {
			return this.#attributesChild.getAttr(key);
		}

		/* NOT FOR BROWSER */

		/** @implements */
		hasAttr(key: string): boolean {
			return this.#attributesChild.hasAttr(key);
		}

		/** @implements */
		getAttrNames(): Set<string> {
			return this.#attributesChild.getAttrNames();
		}

		/** @implements */
		getAttrs(): Record<string, string | true> {
			return this.#attributesChild.getAttrs();
		}

		/** @implements */
		setAttr(key: string, value: string | boolean): void;
		setAttr(prop: Record<string, string | boolean>): void;
		setAttr(keyOrProp: string | Record<string, string | boolean>, value?: string | boolean): void {
			this.#attributesChild.setAttr(keyOrProp as string, value!);
		}

		/** @implements */
		removeAttr(key: string): void {
			this.#attributesChild.removeAttr(key);
		}

		/** @implements */
		toggleAttr(key: string, force?: boolean): void {
			this.#attributesChild.toggleAttr(key, force);
		}
	}
	mixin(AttributesParent, constructor);
	return AttributesParent;
};

mixins['attributesParent'] = __filename;
