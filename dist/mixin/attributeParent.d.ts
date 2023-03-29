export = attributeParent;
/**
 * 子节点含有AttributesToken的类
 * @template T
 * @param {T} Constructor 基类
 * @param {number} i AttributesToken子节点的位置
 * @returns {T}
 */
declare function attributeParent<T>(Constructor: T, i?: number): T;
