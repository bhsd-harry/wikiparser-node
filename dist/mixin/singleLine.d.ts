export = singleLine;
/**
 * 不可包含换行符的类
 * @template {Function} T
 * @param {T} Constructor 基类
 * @returns {T}
 */
declare function singleLine<T extends Function>(Constructor: T): T;
