export = diff;
/**
 * 比较两个文件
 * @param {string} oldStr 旧文本
 * @param {string} newStr 新文本
 * @param {string} uid 唯一标识
 */
declare function diff(oldStr: string, newStr: string, uid?: string): Promise<void>;
