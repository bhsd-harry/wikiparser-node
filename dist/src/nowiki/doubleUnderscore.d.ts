export = DoubleUnderscoreToken;
/**
 * 状态开关
 * @classdesc `{childNodes: [AstText]}`
 */
declare class DoubleUnderscoreToken extends NowikiToken {
    /** @override */
    override print(): string;
    /**
     * @override
     */
    override toString(selector: any): string;
}
import NowikiToken = require(".");
