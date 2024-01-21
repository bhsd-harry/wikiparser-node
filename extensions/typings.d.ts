import type {Config, LintError, Parser} from '../base';
import type {Printer} from './editor';
import type {Linter} from './lint';

export type {Diagnostic} from '@codemirror/lint';
export type {MwConfig, CodeMirror6 as CodeMirror} from '@bhsd/codemirror-mediawiki';

declare global {
	module '/*' {
		/** @see https://npmjs.com/package/@bhsd/codemirror-mediawiki */
		class CodeMirror6 {}
	}

	const Parser: Parser;
	const wikiparse: wikiparse;
}

export interface AST {
	type?: string;
	childNodes?: AST[];
	[x: string]: string;
}

export interface wikiparse {
	id: number;
	setI18N(i18n: Record<string, string>): void;
	setConfig(config: Config): void;
	getConfig(): Promise<Config>;
	json(wikitext: string, include: boolean, qid: number): Promise<AST>;
	print(wikitext: string, include?: boolean, stage?: number, qid?: number): Promise<[number, string, string][]>;
	lint(wikitext: string, include?: boolean, qid?: number): Promise<LintError[]>;
	/* eslint-disable @typescript-eslint/method-signature-style */
	highlight?: (ele: HTMLElement, include?: boolean, linenums?: boolean, start?: number) => Promise<void>;
	edit?: (textbox: HTMLTextAreaElement, include?: boolean) => Printer;
	/* eslint-enable @typescript-eslint/method-signature-style */
	Printer?: typeof Printer;
	Linter?: typeof Linter;
}
