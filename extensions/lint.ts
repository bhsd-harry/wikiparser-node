import type {LintError} from '../base';
import type {Diagnostic} from './typings';

/** 用于语法分析 */
class Linter {
	#id;
	#wikitext: string;
	#running: Promise<LintError[]> | undefined;
	include;

	/** @param include 是否嵌入 */
	constructor(include?: boolean) {
		this.#id = wikiparse.id++;
		this.include = Boolean(include);
	}

	/**
	 * 提交语法分析
	 * @param wikitext 待分析的文本
	 * @description
	 * - 总是更新`#wikitext`以便`#lint`完成时可以判断是否需要重新分析
	 * - 如果已有进行中的分析，则返回该分析的结果
	 * - 否则开始新的分析
	 */
	queue(wikitext: string): Promise<LintError[]> {
		this.#wikitext = wikitext;
		this.#running ??= this.#lint(wikitext);
		return this.#running;
	}

	/**
	 * 执行语法分析
	 * @param wikitext 待分析的文本
	 * @description
	 * - 完成后会检查`#wikitext`是否已更新，如果是则重新分析
	 * - 总是返回最新的分析结果
	 */
	async #lint(wikitext: string): Promise<LintError[]> {
		const {include} = this,
			errors = await wikiparse.lint(wikitext, include, this.#id);
		if (this.include === include && this.#wikitext === wikitext) {
			this.#running = undefined;
			return errors;
		}
		this.#running = this.#lint(this.#wikitext);
		return this.#running;
	}

	/**
	 * 用于 CodeMirror 的语法分析
	 * @param wikitext 待分析的文本
	 */
	async codemirror(wikitext: string): Promise<Diagnostic[]> {
		return (await this.queue(wikitext)).map(({startIndex, endIndex, severity, message}) => ({
			from: startIndex,
			to: endIndex,
			severity,
			message,
		}));
	}
}

wikiparse.Linter = Linter;

export type {Linter};
