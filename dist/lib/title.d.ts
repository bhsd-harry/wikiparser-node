export = Title;
/** MediaWiki页面标题对象 */
declare class Title {
    /**
     * @param {string} title 标题（含或不含命名空间前缀）
     * @param {number} defaultNs 命名空间
     * @param {boolean} decode 是否需要解码
     * @param {boolean} selfLink 是否允许selfLink
     */
    constructor(title: string, defaultNs?: number, config?: import("../../typings/token").ParserConfig, decode?: boolean, selfLink?: boolean);
    valid: boolean;
    ns: number;
    fragment: string;
    encoded: boolean;
    title: string;
    main: string;
    prefix: string;
    interwiki: string;
    /** @override */
    override toString(): string;
}
