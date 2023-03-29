export = GalleryImageToken;
/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
declare class GalleryImageToken extends FileToken {
    /**
     * @param {string} link 图片文件名
     * @param {string|undefined} text 图片参数
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(link: string, text: string | undefined, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    #private;
}
import FileToken = require("./file");
