import type {
	Diagnostic,
} from '@codemirror/lint';
import type {editor} from 'monaco-editor';
import type {CodeJar as CodeJarAsync} from 'codejar-async';
import type {Config, LintError, AST} from '../base';

export interface PrinterBase {
	include: boolean;
}

export interface LinterBase {
	include: boolean;
	queue(wikitext: string): Promise<LintError[]>;
	codemirror(wikitext: string): Promise<Diagnostic[]>;
	monaco(wikitext: string): Promise<editor.IMarkerData[]>;
}

declare global {
	const wikiparse: wikiparse;
}

export type codejar = (textbox: HTMLTextAreaElement, include?: boolean) => CodeJarAsync & {include: boolean};

/* eslint-disable @typescript-eslint/method-signature-style */
export interface wikiparse {
	id: number;
	setI18N: (i18n: Record<string, string>) => void;
	setConfig: (config: Config) => void;
	getConfig: () => Promise<Config>;
	json: (wikitext: string, include: boolean, qid?: number, stage?: number) => Promise<AST>;
	print: (wikitext: string, include?: boolean, stage?: number, qid?: number) => Promise<[number, string, string][]>;
	lint: (wikitext: string, include?: boolean, qid?: number) => Promise<LintError[]>;
	highlight?: (ele: HTMLElement, include?: boolean, linenums?: boolean, start?: number) => Promise<void>;
	edit?: (textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	codejar?: codejar | Promise<codejar>;
	Printer?: new (preview: HTMLDivElement, textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	Linter?: new (include?: boolean) => LinterBase;
}
/* eslint-enable @typescript-eslint/method-signature-style */
