import type {ConfigData, LintError, Diagnostic, Action, LinterBase, editor} from './typings';

/** 用于语法分析 */
class Linter implements LinterBase {
	readonly #id;
	#wikitext: string;
	#running: Promise<LintError[]> | undefined;
	#done: LintError[];
	#config: ConfigData;
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
	async queue(wikitext: string): Promise<LintError[]> {
		if (this.#wikitext === wikitext && this.#config === wikiparse.config && !this.#running) {
			return this.#done;
		}
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
		this.#config = wikiparse.config;
		const {include} = this,
			errors = await wikiparse.lint(wikitext, include, this.#id);
		if (this.include === include && this.#wikitext === wikitext && this.#config === wikiparse.config) {
			this.#running = undefined;
			this.#done = errors;
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
		return (await this.queue(wikitext))
			.map(({startIndex, endIndex, severity, message, rule, fix, suggestions = []}): Diagnostic => ({
				source: 'WikiLint',
				from: startIndex,
				to: endIndex,
				severity,
				rule,
				message: `${message} (${rule})`,
				actions: [
					...fix ? [{name: `Fix: ${fix.desc}`, fix}] : [],
					...suggestions.map(suggestion => ({name: `Suggestion: ${suggestion.desc}`, fix: suggestion})),
				].map(({name, fix: {range: [from, to], text}}): Action => ({
					name,
					/** @implements */ apply(view): void {
						view.dispatch({changes: {from, to, insert: text}});
					},
				})),
			}));
	}

	/**
	 * 用于 Monaco 的语法分析
	 * @param wikitext 待分析的文本
	 */
	async monaco(wikitext: string): Promise<editor.IMarkerData[]> {
		return (await this.queue(wikitext))
			.map(({startLine, startCol, endLine, endCol, severity, message, rule}): editor.IMarkerData => ({
				source: 'WikiLint',
				startLineNumber: startLine + 1,
				startColumn: startCol + 1,
				endLineNumber: endLine + 1,
				endColumn: endCol + 1,
				severity: severity === 'error' ? 8 : 4,
				code: rule,
				message,
			}));
	}
}

wikiparse.Linter = Linter;
