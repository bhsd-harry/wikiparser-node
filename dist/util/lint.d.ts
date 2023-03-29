export type LintError = import('../../typings/token').LintError;
/**
 * 生成对于子节点的LintError对象
 * @param {Token} child 子节点
 * @param {{top: number, left: number, start: number}} boundingRect 父节点的绝对定位
 * @param {string} msg 错误信息
 * @param {'error'|'warning'} severity 严重程度
 * @returns {LintError}
 */
export function generateForChild(child: Token, boundingRect: {
    top: number;
    left: number;
    start: number;
}, msg: string, severity?: 'error' | 'warning'): LintError;
/**
 * 生成对于自己的LintError对象
 * @param {Token} token 节点
 * @param {{top: number, left: number, start: number}} boundingRect 绝对定位
 * @param {string} msg 错误信息
 * @param {'error'|'warning'} severity 严重程度
 * @returns {LintError}
 */
export function generateForSelf(token: Token, boundingRect: {
    top: number;
    left: number;
    start: number;
}, msg: string, severity?: 'error' | 'warning'): LintError;
import Token = require("../src");
