import type {
	Diagnostic as DiagnosticBase,
} from '@codemirror/lint';
import type {editor} from 'monaco-editor';
import type {CodeJar} from 'codejar-async';
import type {
	ColorInformation,
	ColorPresentation,
} from 'vscode-languageserver-types';
// 必须写在一行内
import type {Config, LintError, AST, LanguageService} from '../base';

export type Diagnostic = DiagnosticBase & {rule: LintError.Rule};

export interface PrinterBase {
	include: boolean;
}

export interface LinterBase {
	include: boolean;
	queue(wikitext: string): Promise<LintError[]>;
	codemirror(wikitext: string): Promise<Diagnostic[]>;
	monaco(wikitext: string): Promise<editor.IMarkerData[]>;
}

export type CodeJarAsync = CodeJar & {
	include: boolean;
	editor: HTMLElement;
};

export type codejar = (textbox: HTMLTextAreaElement, include?: boolean, linenums?: boolean) => CodeJarAsync;

export interface LanguageServiceBase extends Omit<
	LanguageService,
	'provideDocumentSymbols' | 'provideCodeAction' | 'findStyleTokens'
> {
	provideDocumentColors(text: string): Promise<ColorInformation[]>;
	provideColorPresentations(color: ColorInformation): Promise<ColorPresentation[]>;
	findStyleTokens(): Promise<AST[]>;
}

/* eslint-disable @typescript-eslint/method-signature-style */
export interface wikiparse {
	version: string;
	CDN: string;
	setI18N: (i18n?: Record<string, string>) => void;
	setConfig: (config: Config) => void;
	getConfig: () => Promise<Config>;
	json: (wikitext: string, include: boolean, qid?: number, stage?: number) => Promise<AST>;
	print: (wikitext: string, include?: boolean, stage?: number, qid?: number) => Promise<[number, string, string][]>;
	lint: (wikitext: string, include?: boolean, qid?: number) => Promise<LintError[]>;
	lineNumbers: (html: HTMLElement, start?: number, paddingTop?: string) => void;
	highlight?: (ele: HTMLElement, include?: boolean, linenums?: boolean, start?: number) => Promise<void>;
	edit?: (textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	codejar?: codejar | Promise<codejar>;
	Printer?: new (preview: HTMLDivElement, textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	Linter?: new (include?: boolean) => LinterBase;
	LanguageService?: new (include?: boolean) => LanguageServiceBase;
}
/* eslint-enable @typescript-eslint/method-signature-style */

declare global {
	const wikiparse: wikiparse;
}
