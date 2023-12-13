import type {LintError} from '../base';
import type {wikiparse as Wikiparse, Diagnostic} from './typings';

const {wikiparse} = window as unknown as {wikiparse: Wikiparse};

/** 用于语法分析 */
class Linter {
	#id;
	#wikitext: string | undefined;
	#running: Promise<LintError[]> | undefined;
	include;

	/** @param include 是否嵌入 */
	constructor(include?: boolean) {
		this.#id = wikiparse.id++;
		this.#wikitext = undefined;
		this.#running = undefined;
		this.include = Boolean(include);
	}

	/**
	 * 提交语法分析
	 * @param wikitext 待分析的文本
	 */
	queue(wikitext: string): Promise<LintError[]> {
		this.#wikitext = wikitext;
		this.#running = this.#lint(wikitext);
		return this.#running;
	}

	/**
	 * 执行语法分析
	 * @param wikitext 待分析的文本
	 */
	async #lint(wikitext: string): Promise<LintError[]> {
		const {include} = this,
			errors = await wikiparse.lint(wikitext, include, this.#id);
		return this.include === include && this.#wikitext === wikitext ? errors : this.#running!;
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
