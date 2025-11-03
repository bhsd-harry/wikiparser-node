import type {AttributesToken} from '../internal';

export interface AttributesParentBase {

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
}

/**
 * 子节点含有AttributesToken的类
 * @param i AttributesToken子节点的位置
 */
export const attributesParent = (i = 0) => <T extends AstConstructor>(constructor: T): T => {
	LINT: {
		abstract class AttributesParent extends constructor implements AttributesParentBase {
			/** AttributesToken子节点 */
			#getAttributesChild(): AttributesToken {
				return this.childNodes[i] as AttributesToken;
			}

			hasAttr(key: string): boolean {
				LSP: return this.#getAttributesChild().hasAttr(key);
				this.lspError('AttributesParent.hasAttr');
			}

			getAttr(key: string): string | true | undefined {
				return this.#getAttributesChild().getAttr(key);
			}
		}
		return AttributesParent;
	}
};
