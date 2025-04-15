import type {
	LanguageServiceBase,
	SignatureData,
	ColorInformation,
	ColorPresentation,
	CompletionItem,
	Position,
	FoldingRange,
	DocumentLink,
	Location,
	Range,
	WorkspaceEdit,
	ServerDiagnostic,
	Hover,
	SignatureHelp,
	InlayHint,
	AST,
} from './typings';

let data: Promise<SignatureData> | undefined;

/** 用于语法分析 */
class LanguageService implements LanguageServiceBase {
	readonly #id;
	readonly #include;
	#hasData = false;

	/** @implements */
	get include(): boolean {
		return this.#include;
	}

	/** @param include 是否嵌入 */
	constructor(include = true) {
		this.#id = wikiparse.id++;
		this.#include = include;
	}

	/** @implements */
	destroy(): void {
		wikiparse.provide('destroy', this.#id);
	}

	/** @implements */
	provideColorPresentations(color: ColorInformation): Promise<ColorPresentation[]> {
		return wikiparse.provide(
			'colorPresentations',
			this.#id,
			color,
			this.#include,
		) as Promise<ColorPresentation[]>;
	}

	/** @implements */
	provideDocumentColors(text: string): Promise<ColorInformation[]> {
		return wikiparse.provide(
			'documentColors',
			this.#id + 0.1,
			text,
			this.#include,
		) as Promise<ColorInformation[]>;
	}

	/** @implements */
	provideFoldingRanges(text: string): Promise<FoldingRange[]> {
		return wikiparse.provide(
			'foldingRanges',
			this.#id + 0.2,
			text,
			this.#include,
		) as Promise<FoldingRange[]>;
	}

	/** @implements */
	provideLinks(text: string): Promise<DocumentLink[]> {
		return wikiparse.provide('links', this.#id + 0.3, text, this.#include) as Promise<DocumentLink[]>;
	}

	/** @implements */
	provideCompletionItems(text: string, position: Position): Promise<CompletionItem[] | undefined> {
		return wikiparse.provide(
			'completionItems',
			this.#id + 0.4,
			text,
			this.#include,
			position,
		) as Promise<CompletionItem[] | undefined>;
	}

	/** @implements */
	provideReferences(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined> {
		return wikiparse.provide(
			'references',
			this.#id + 0.5,
			text,
			this.#include,
			position,
		) as Promise<Omit<Location, 'uri'>[] | undefined>;
	}

	/** @implements */
	provideDefinition(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined> {
		return wikiparse.provide(
			'definition',
			this.#id + 0.6,
			text,
			this.#include,
			position,
		) as Promise<Omit<Location, 'uri'>[] | undefined>;
	}

	/** @implements */
	resolveRenameLocation(text: string, position: Position): Promise<Range | undefined> {
		return wikiparse.provide(
			'renameLocation',
			this.#id + 0.7,
			text,
			this.#include,
			position,
		) as Promise<Range | undefined>;
	}

	/** @implements */
	provideRenameEdits(text: string, position: Position, newName: string): Promise<WorkspaceEdit | undefined> {
		return wikiparse.provide(
			'renameEdits',
			this.#id + 0.8,
			text,
			this.#include,
			position,
			newName,
		) as Promise<WorkspaceEdit | undefined>;
	}

	/** @implements */
	provideDiagnostics(wikitext: string, warning?: boolean): Promise<ServerDiagnostic[]> {
		return wikiparse.provide(
			'diagnostics',
			this.#id + 0.9,
			wikitext,
			this.#include,
			warning,
		) as Promise<ServerDiagnostic[]>;
	}

	/** 懒加载魔术字信息 */
	async #loadData(): Promise<void> {
		if (!this.#hasData) {
			this.#hasData = true;
			data ??= (async () => (await fetch(`${wikiparse.CDN}/data/signatures.json`)).json())();
			wikiparse.provide('data', this.#id, await data, this.#include);
		}
	}

	/** @implements */
	provideHover(text: string, position: Position): Promise<Hover | undefined> {
		void this.#loadData();
		return wikiparse.provide(
			'hover',
			this.#id + 0.05,
			text,
			this.#include,
			position,
		) as Promise<Hover | undefined>;
	}

	/** @implements */
	provideSignatureHelp(text: string, position: Position): Promise<SignatureHelp | undefined> {
		void this.#loadData();
		return wikiparse.provide(
			'signatureHelp',
			this.#id + 0.15,
			text,
			this.#include,
			position,
		) as Promise<SignatureHelp | undefined>;
	}

	/** @implements */
	provideInlayHints(text: string): Promise<InlayHint[]> {
		return wikiparse.provide('inlayHints', this.#id + 0.25, text, this.#include) as Promise<InlayHint[]>;
	}

	/** @implements */
	findStyleTokens(): Promise<AST[]> {
		return wikiparse.provide('findStyleTokens', this.#id + 0.35) as Promise<AST[]>;
	}
}

wikiparse.LanguageService = LanguageService;
