export = FileToken;
/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
declare class FileToken extends LinkToken {
    set link(arg: string | import("../../lib/title"));
    /** 图片链接 */
    get link(): string | import("../../lib/title");
    /** 图片大小 */
    get size(): {
        width: string;
        height: string;
    };
    set width(arg: string);
    /** 图片宽度 */
    get width(): string;
    set height(arg: string);
    /** 图片高度 */
    get height(): string;
    /**
     * 获取所有图片参数节点
     * @returns {ImageParameterToken[]}
     */
    getAllArgs(): ImageParameterToken[];
    /**
     * 获取指定图片参数
     * @param {string} key 参数名
     * @complexity `n`
     */
    getArgs(key: string): ImageParameterToken[];
    /** 获取图片框架属性参数节点 */
    getFrameArgs(): ImageParameterToken[];
    /** 获取图片水平对齐参数节点 */
    getHorizAlignArgs(): ImageParameterToken[];
    /** 获取图片垂直对齐参数节点 */
    getVertAlignArgs(): ImageParameterToken[];
    /**
     * 获取生效的指定图片参数
     * @param {string} key 参数名
     * @complexity `n`
     */
    getArg(key: string): ImageParameterToken;
    /**
     * 是否具有指定图片参数
     * @param {string} key 参数名
     * @complexity `n`
     */
    hasArg(key: string): boolean;
    /**
     * 移除指定图片参数
     * @param {string} key 参数名
     * @complexity `n`
     */
    removeArg(key: string): void;
    /**
     * 获取图片参数名
     * @complexity `n`
     */
    getKeys(): string[];
    /**
     * 获取指定的图片参数值
     * @param {string} key 参数名
     * @complexity `n`
     */
    getValues(key: string): (string | true)[];
    /**
     * 获取生效的指定图片参数值
     * @param {string} key 参数名
     * @complexity `n`
     */
    getValue(key: string): string | true;
    /**
     * 设置图片参数
     * @param {string} key 参数名
     * @param {string|boolean} value 参数值
     * @complexity `n`
     * @throws `RangeError` 未定义的图片参数
     * @throws `SyntaxError` 非法的参数
     */
    setValue(key: string, value: string | boolean): void;
    #private;
}
import LinkToken = require(".");
import ImageParameterToken = require("../imageParameter");
