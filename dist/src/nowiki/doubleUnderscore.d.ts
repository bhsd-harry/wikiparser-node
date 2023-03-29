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
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override cloneNode(): DoubleUnderscoreToken;
    /**
     * @override
     * @throws `Error` 禁止修改
     */
    override setText(): void;
}
import NowikiToken = require(".");
