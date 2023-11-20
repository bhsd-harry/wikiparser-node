var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(() => {
    const { wikiparse } = window;
    /** 用于语法分析 */
    class Linter {
        /* eslint-enable es-x/no-class-fields */
        /** @param include 是否嵌入 */
        constructor(include) {
            this.id = wikiparse.id++;
            this.include = Boolean(include);
            this.wikitext = undefined;
            this.running = undefined;
        }
        /**
         * 提交语法分析
         * @param wikitext 待分析的文本
         */
        queue(wikitext) {
            this.wikitext = wikitext;
            this.running = this.lint(wikitext);
            return this.running;
        }
        /**
         * 执行语法分析
         * @param wikitext 待分析的文本
         */
        lint(wikitext) {
            return __awaiter(this, void 0, void 0, function* () {
                const { include } = this, errors = yield wikiparse.lint(wikitext, include, this.id);
                return this.include === include && this.wikitext === wikitext ? errors : this.running;
            });
        }
    }
    wikiparse.Linter = Linter;
})();
