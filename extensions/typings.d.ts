import {CodeMirror6} from '@bhsd/codemirror-mediawiki';
import type {Config, LintError, Parser, AST} from '../base';
import type {Printer} from './editor';
import type {Linter} from './lint';

export type {Diagnostic, Action} from '@codemirror/lint';
export type {Config, LintError, AST};

declare global {
	module '/*' {
		/** @see https://www.npmjs.com/package/@bhsd/codemirror-mediawiki */
		export {CodeMirror6};
	}

	const Parser: Parser;
	const wikiparse: wikiparse;
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
