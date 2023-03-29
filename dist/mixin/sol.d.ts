export = sol;
/**
 * 只能位于行首的类
 * @template T
 * @param {T} Constructor 基类
 * @returns {T}
 */
declare function sol<T>(Constructor: T): T;
