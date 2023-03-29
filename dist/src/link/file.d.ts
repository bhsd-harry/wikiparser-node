export = FileToken;
/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
declare class FileToken extends LinkToken {
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
    #private;
}
import LinkToken = require(".");
import ImageParameterToken = require("../imageParameter");
