export = parseSelector;
/**
 * 解析选择器
 * @param {string} selector
 * @throws `SyntaxError` 非法的选择器
 */
declare function parseSelector(selector: string): import("../../typings/parser").SelectorArray[][];
declare namespace parseSelector {
    export { SelectorArray, pseudo };
}
type SelectorArray = import('../../typings/parser').SelectorArray;
type pseudo = import('../../typings/parser').pseudo;
