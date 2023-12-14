import type {EditorView} from '@codemirror/view';
import type {LintSource} from '@codemirror/lint';
import type {Config, LintError} from '../base';
import type {Printer} from './editor';
import type {Linter} from './lint';

export type {EditorView};
export type {Diagnostic} from '@codemirror/lint';

declare global {
	module 'https://*' {
		/** @see https://npmjs.com/package/@bhsd/codemirror-mediawiki */
		declare class CodeMirror6 {
			/** @class */
			constructor(textarea: HTMLTextAreaElement);
			view: EditorView;

			/** 添加 linter */
			lint(source: LintSource): void;

			/** 立即执行 lint */
			update(): void;

			/** 更新至文本框 */
			save(): void;

			/** 设置语言 */
			setLanguage(lang: string, config?: unknown): void;
		}
	}
}

export interface wikiparse {
	readonly MAX_STAGE: number;
	id: number;
	setI18N(i18n: Record<string, string>): void;
	setConfig(config: Config): void;
	getConfig(): Promise<Config>;
	print(wikitext: string, include?: boolean, stage?: number, qid?: number): Promise<[number, string, string][]>;
	lint(wikitext: string, include?: boolean, qid?: number): Promise<LintError[]>;
	/* eslint-disable @typescript-eslint/method-signature-style */
	highlight?: (ele: HTMLElement, include?: boolean, linenums?: boolean, start?: number) => Promise<void>;
	edit?: (textbox: HTMLTextAreaElement, include?: boolean) => Printer;
	/* eslint-enable @typescript-eslint/method-signature-style */
	Printer?: typeof Printer;
	Linter?: typeof Linter;
}
