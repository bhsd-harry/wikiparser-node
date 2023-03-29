/**
 * 定制TypeError消息
 * @param {Function} constructor 类
 * @param {string} method
 * @param {...string} args 可接受的参数类型
 * @throws `TypeError`
 */
export function typeError({ name }: Function, method: string, ...args: string[]): never;
/**
 * 不是被构造器或原型方法调用
 * @param {string} name 方法名称
 */
export function externalUse(name: string): boolean;
/**
 * 撤销最近一次Mutation
 * @param {import('../../typings/event').AstEvent} e 事件
 * @param {import('../../typings/event').AstEventData} data 事件数据
 * @throws `RangeError` 无法撤销的事件类型
 */
export function undo(e: import('../../typings/event').AstEvent, data: import('../../typings/event').AstEventData): void;
