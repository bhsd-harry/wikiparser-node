export = CategoryToken;
/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
declare class CategoryToken extends LinkToken {
    set sortkey(arg: string);
    /** 分类排序关键字 */
    get sortkey(): string;
    /**
     * 设置排序关键字
     * @param {string} text 排序关键字
     */
    setSortkey(text: string): void;
}
import LinkToken = require(".");
