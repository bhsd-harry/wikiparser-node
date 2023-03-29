export = DdToken;
/**
 * :
 * @classdesc `{childNodes: [AstText]}`
 */
declare class DdToken extends NowikiToken {
    /** 是否包含<dt> */
    get dt(): boolean;
    /** 是否包含<ul> */
    get ul(): boolean;
    /** 是否包含<ol> */
    get ol(): boolean;
    set indent(arg: number);
    /** 缩进数 */
    get indent(): number;
}
import NowikiToken = require(".");
