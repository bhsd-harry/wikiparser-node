import type {LintError, wikiparse} from './typings';

(() => {
	const {wikiparse} = window as unknown as {wikiparse: wikiparse};

	/** 用于语法分析 */
	class Linter {
		/* eslint-disable es-x/no-class-fields */
		declare private id;
		declare private include;
		declare private wikitext: string | undefined;
		declare private running: Promise<LintError[]> | undefined;
		/* eslint-enable es-x/no-class-fields */

		/** @param include 是否嵌入 */
		constructor(include?: boolean) {
			this.id = wikiparse.id++;
			this.include = Boolean(include);
			this.wikitext = undefined;
			this.running = undefined;
		}

		/**
		 * 提交语法分析
		 * @param wikitext 待分析的文本
		 */
		queue(wikitext: string): Promise<LintError[]> {
			this.wikitext = wikitext;
			this.running = this.lint(wikitext);
			return this.running;
		}

		/**
		 * 执行语法分析
		 * @param wikitext 待分析的文本
		 */
		private async lint(wikitext: string): Promise<LintError[]> {
			const {include} = this,
				errors = await wikiparse.lint(wikitext, include, this.id);
			return this.include === include && this.wikitext === wikitext ? errors : this.running!;
		}
	}

	wikiparse.Linter = Linter;
})();
