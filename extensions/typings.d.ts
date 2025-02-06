import type {
	Diagnostic,
} from '@codemirror/lint';
import type {editor} from 'monaco-editor';
import type {CodeJar} from 'codejar-async';
import type {
	ColorInformation,
	Position,
	FoldingRange,
	DocumentLink,
	CompletionItem,
	ColorPresentation,
} from 'vscode-languageserver-types';
import type {
	Config,
	LintError,
	AST,
} from '../base';

export type {
	AST,
};

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

export type CodeJarAsync = CodeJar & {
	include: boolean;
	editor: HTMLElement;
};

export type codejar = (textbox: HTMLTextAreaElement, include?: boolean, linenums?: boolean) => CodeJarAsync;

/* eslint-disable @typescript-eslint/method-signature-style */
export interface wikiparse {
	version: string;
	CDN: string;
	id: number;
	setI18N: (i18n: Record<string, string>) => void;
	setConfig: (config: Config) => void;
	getConfig: () => Promise<Config>;
	json: (wikitext: string, include: boolean, qid?: number, stage?: number) => Promise<AST>;
	print: (wikitext: string, include?: boolean, stage?: number, qid?: number) => Promise<[number, string, string][]>;
	lint: (wikitext: string, include?: boolean, qid?: number) => Promise<LintError[]>;
	provideDocumentColors: (wikitext: string, qid?: number) => Promise<ColorInformation[]>;
	provideFoldingRanges: (wikitext: string, qid?: number) => Promise<FoldingRange[]>;
	provideLinks: (wikitext: string, qid?: number) => Promise<DocumentLink[]>;
	provideCompletionItems: (wikitext: string, position: Position, qid?: number) => Promise<CompletionItem[] | null>;
	provideColorPresentations: (color: ColorInformation, qid?: number) => Promise<ColorPresentation[]>;
	lineNumbers: (html: HTMLElement, start?: number, paddingTop?: string) => void;
	highlight?: (ele: HTMLElement, include?: boolean, linenums?: boolean, start?: number) => Promise<void>;
	edit?: (textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	codejar?: codejar | Promise<codejar>;
	Printer?: new (preview: HTMLDivElement, textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	Linter?: new (include?: boolean) => LinterBase;
}
/* eslint-enable @typescript-eslint/method-signature-style */
