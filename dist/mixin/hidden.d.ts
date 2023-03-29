export = hidden;
/**
 * 解析后不可见的类
 * @template T
 * @param {T} Constructor 基类
 * @returns {T}
 */
declare function hidden<T>(Constructor: T): T;
