import type {Config, LintError, ParserBase} from '../base';

/** 类似Node */
declare class AstNode {
	type: string;
	childNodes: AstNode[];

	/** Linter */
	lint(): LintError[];

	/** 以HTML格式打印 */
	print(): string;
}

export interface Parser extends ParserBase {

	/**
	 * 解析wikitext
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): AstNode;
}

/** 用于语法分析 */
declare class Linter {
	include: boolean;

	/** @param include 是否嵌入 */
	constructor(include?: boolean);

	/**
	 * 提交语法分析
	 * @param wikitext 待分析的文本
	 */
	queue(wikitext: string): Promise<LintError[]>;
}

/** 用于打印AST */
declare class Printer {
	include: boolean;
	running: Promise<void> | undefined;
	ticks: [number, 'coarsePrint' | 'finePrint' | undefined];

	/**
	 * @param preview 置于下层的代码高亮
	 * @param textbox 置于上层的文本框
	 * @param include 是否嵌入
	 */
	constructor(preview: HTMLDivElement, textbox: HTMLTextAreaElement, include?: boolean);

	/**
	 * 用于debounce
	 * @param delay 延迟
	 * @param method 方法
	 */
	queue(delay: number, method: 'coarsePrint' | 'finePrint'): void;

	/** 初步解析 */
	coarsePrint(): Promise<void>;

	/** 根据可见范围精细解析 */
	finePrint(): Promise<void>;
}

export interface wikiparse {
	readonly MAX_STAGE: number;
	id: number;
	config?: Config;
	setI18N(i18n: Record<string, string>): void;
	setConfig(config: Config): void;
	getConfig(): Promise<Config>;
	print(wikitext: string, include?: boolean, stage?: number, qid?: number): Promise<[number, string, string][]>;
	lint(wikitext: string, include: boolean, qid?: number): Promise<LintError[]>;
	/* eslint-disable @typescript-eslint/method-signature-style */
	highlight?: (ele: HTMLElement, linenums: boolean, start?: number) => Promise<void>;
	edit?: (textbox: HTMLTextAreaElement, include?: boolean) => Printer;
	/* eslint-enable @typescript-eslint/method-signature-style */
	Printer?: typeof Printer;
	Linter?: typeof Linter;
}
