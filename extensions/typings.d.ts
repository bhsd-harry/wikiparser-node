import type {
	Diagnostic as DiagnosticBase,

	/* NOT EXPORTED */

	Action,
} from '@codemirror/lint';
import type {editor} from 'monaco-editor';
import type {CodeJar} from 'codejar-async';
import type {
	ColorInformation,
	ColorPresentation,
	CodeAction,

	/* NOT EXPORTED */

	Position,
	FoldingRange,
	DocumentLink,
	Location,
	Range,
	WorkspaceEdit,
	Diagnostic as ServerDiagnostic,
	Hover,
	SignatureHelp,
	InlayHint,
} from 'vscode-languageserver-types';
// 必须写在一行内
// eslint-disable-next-line @stylistic/max-len
import type {Config, ConfigData, LintConfig, LintError, AST, LanguageService, CompletionItem, SignatureData, Parser} from '../base';

/* NOT EXPORTED */

import {CodeMirror6, registerMediaWiki} from '@bhsd/codemirror-mediawiki';

export type {
	AST,
	Config,
	ConfigData,
	LintConfig,
	LintError,
	LanguageService,
	SignatureData,
	Action,
	editor,
	CodeJar,
	ColorInformation,
	Position,
	FoldingRange,
	DocumentLink,
	CompletionItem,
	ColorPresentation,
	Location,
	Range,
	WorkspaceEdit,
	ServerDiagnostic,
	Hover,
	SignatureHelp,
	InlayHint,
	CodeAction,
};

export type Command = ['setI18N', Record<string, string>?]
	| ['setLintConfig', LintConfig | undefined]
	| ['setConfig', ConfigData]
	| ['getConfig', number]
	| ['destroy' | 'findStyleTokens', number]
	| ['data', number, SignatureData, boolean]
	| ['colorPresentations', number, ColorInformation, boolean]
	| ['diagnostics', number, string, boolean, boolean | undefined]
	| [
		'json' | 'lint' | 'print' | 'documentColors' | 'foldingRanges' | 'links' | 'inlayHints',
		number,
		string,
		boolean?,
		number?,
	]
	| ['codeAction', number, string, boolean, Range]
	| ['resolveCodeAction', number, string, boolean]
	| [
		'completionItems'
		| 'references'
		| 'definition'
		| 'renameLocation'
		| 'renameEdits'
		| 'hover'
		| 'signatureHelp',
		number,
		string,
		boolean,
		Position,
		string?,
	];

/* NOT EXPORTED END */

declare interface Test {
	desc: string;
	wikitext?: string;
}

export type Diagnostic = DiagnosticBase & {rule: LintError.Rule};

export interface PrinterBase {
	include: boolean;
}

export interface LinterBase {
	include: boolean;
	queue(wikitext: string): Promise<LintError[] & {output?: string}>;
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
	'provideDocumentSymbols' | 'provideCodeAction'
> {
	provideDocumentColors(text: string): Promise<ColorInformation[]>;
	provideColorPresentations(color: ColorInformation): Promise<ColorPresentation[]>;
	resolveCodeAction(rule?: string): Promise<CodeAction>;
	findStyleTokens(): Promise<AST[]>;
}

/* eslint-disable @typescript-eslint/method-signature-style */
export interface wikiparse {
	version: string;
	CDN: string;
	setI18N: (i18n?: Record<string, string>) => void;
	setLintConfig: (config?: LintConfig) => void;
	setConfig: (config: ConfigData) => void;
	getConfig: () => Promise<Config>;
	json: (wikitext: string, include: boolean, qid?: number, stage?: number) => Promise<AST>;
	print: (wikitext: string, include?: boolean, stage?: number, qid?: number) => Promise<[number, string, string][]>;
	lint: (wikitext: string, include?: boolean, qid?: number) => Promise<LintError[] & {output?: string}>;
	lineNumbers: (html: HTMLElement, start?: number, paddingTop?: string, paddingBottom?: string) => void;
	highlight?: (ele: HTMLElement, include?: boolean, linenums?: boolean, start?: number) => Promise<void>;
	edit?: (textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	codejar?: codejar | Promise<codejar>;
	Printer?: new (preview: HTMLDivElement, textbox: HTMLTextAreaElement, include?: boolean) => PrinterBase;
	Linter?: new (include?: boolean) => LinterBase;
	LanguageService?: new (include?: boolean) => LanguageServiceBase;

	/* NOT EXPORTED */

	id: number;
	config: ConfigData;
	provide: (
		...args: Exclude<Command, ['setI18N' | 'setLintConfig' | 'setConfig' | 'getConfig', ...unknown[]]>
	) => Promise<unknown>;
}
/* eslint-enable @typescript-eslint/method-signature-style */

declare global {
	type PrepareDoneBtn = (
		btn: HTMLButtonElement,
		select: HTMLSelectElement,
		tests: Test[],
		dones: Set<string>,
		key: string,
	) => void;
	type HideOptGroup = (optgroup: HTMLOptGroupElement) => void;
	type AddOption = (
		optgroup: HTMLOptGroupElement | undefined,
		select: HTMLSelectElement,
		tests: Test[],
		dones: Set<string>,
		i: number,
		appendOptgroup?: boolean,
		appendOption?: boolean,
	) => HTMLOptGroupElement | undefined;
	type ChangeHandler = (
		pre: HTMLPreElement,
		btn: HTMLButtonElement,
		select: HTMLSelectElement,
		tests: Test[],
	) => void;
	type HashChangeHandler = (select: HTMLSelectElement, tests: Test[]) => void;
	type InputHandler = (input: HTMLInputElement, select: HTMLSelectElement, dones: Set<string>) => void;

	module '/wikiparser-node/extensions/*' {
		export const prepareDoneBtn: PrepareDoneBtn;
		export const hideOptGroup: HideOptGroup;
		export const addOption: AddOption;
		export const changeHandler: ChangeHandler;
		export const hashChangeHandler: HashChangeHandler;
		export const inputHandler: InputHandler;
	}

	const wikiparse: wikiparse;

	/* NOT EXPORTED */

	module '/codemirror-mediawiki/*' {
		/** @see https://www.npmjs.com/package/@bhsd/codemirror-mediawiki */
		export {CodeMirror6, registerMediaWiki};
	}
	module '/codejar-async/*' {
		/** @see https://www.npmjs.com/package/codejar-async */
		const CodeJar: (...args: unknown[]) => CodeJar;
		export {CodeJar};
	}
	module 'https://*';

	type MonacoEditor = typeof editor;

	const Parser: Parser;
}
