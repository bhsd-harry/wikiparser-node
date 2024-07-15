import {CodeMirror6} from '@bhsd/codemirror-mediawiki';
import type {
	Diagnostic,
	Action,
} from '@codemirror/lint';
import type {editor} from 'monaco-editor';
import type {CodeJar as CodeJarAsync} from 'codejar-async';
import type {Config, LintError, AST, Parser} from '../base';

export type {Config, LintError, AST, Diagnostic, Action, editor, CodeJarAsync};

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
	module '/*' {
		/** @see https://www.npmjs.com/package/@bhsd/codemirror-mediawiki */
		export {CodeMirror6};
	}

	module 'https://*';

	const Parser: Parser;
	const wikiparse: wikiparse;

	type MonacoEditor = typeof editor;
}

export type codejar = (textbox: HTMLTextAreaElement, include?: boolean) => CodeJarAsync & {include: boolean};

/* eslint-disable @typescript-eslint/method-signature-style */
export interface wikiparse {
	id: number;
	setI18N: (i18n: Record<string, string>) => void;
	setConfig: (config: Config) => void;
	getConfig: () => Promise<Config>;
	json: (wikitext: string, include: boolean, qid?: number) => Promise<AST>;
	print: (wikitext: string, include?: boolean, stage?: number, qid?: number) => Promise<[number, string, string][]>;
	lint: (wikitext: string, include?: boolean, qid?: number) => Promise<LintError[]>;
	lineNumbers: (html: HTMLElement, start?: number) => void;
	highlight?: (ele: HTMLElement, include?: boolean, linenums?: boolean, start?: number) => Promise<void>;
	edit?: (textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	codejar?: codejar | Promise<codejar>;
	Printer?: new (preview: HTMLDivElement, textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	Linter?: new (include?: boolean) => LinterBase;
}
/* eslint-enable @typescript-eslint/method-signature-style */
