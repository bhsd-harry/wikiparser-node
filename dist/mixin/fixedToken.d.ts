export = fixedToken;
/**
 * 不可增删子节点的类
 * @template T
 * @param {T} Constructor 基类
 * @returns {T}
 */
declare function fixedToken<T>(Constructor: T): T;
