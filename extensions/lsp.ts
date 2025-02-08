import type {
	LanguageServiceBase,
	ColorInformation,
	ColorPresentation,
	CompletionItem,
	Position,
	FoldingRange,
	DocumentLink,
	Location,
	Range,
	WorkspaceEdit,
} from './typings';

/** 用于语法分析 */
class LanguageService implements LanguageServiceBase {
	readonly #id;

	constructor() {
		this.#id = wikiparse.id++;
	}

	/** @implements */
	provideColorPresentations(color: ColorInformation): Promise<ColorPresentation[]> {
		return wikiparse.provide('colorPresentations', this.#id, color) as Promise<ColorPresentation[]>;
	}

	/** @implements */
	provideDocumentColors(text: string): Promise<ColorInformation[]> {
		return wikiparse.provide('documentColors', this.#id + 0.1, text) as Promise<ColorInformation[]>;
	}

	/** @implements */
	provideFoldingRanges(text: string): Promise<FoldingRange[]> {
		return wikiparse.provide('foldingRanges', this.#id + 0.2, text) as Promise<FoldingRange[]>;
	}

	/** @implements */
	provideLinks(text: string): Promise<DocumentLink[]> {
		return wikiparse.provide('links', this.#id + 0.3, text) as Promise<DocumentLink[]>;
	}

	/** @implements */
	provideCompletionItems(text: string, position: Position): Promise<CompletionItem[] | undefined> {
		return wikiparse
			.provide('completionItems', this.#id + 0.4, text, position) as Promise<CompletionItem[] | undefined>;
	}

	/** @implements */
	provideReferences(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined> {
		return wikiparse
			.provide('references', this.#id + 0.5, text, position) as Promise<Omit<Location, 'uri'>[] | undefined>;
	}

	/** @implements */
	provideDefinition(text: string, position: Position): Promise<Omit<Location, 'uri'>[] | undefined> {
		return wikiparse
			.provide('definition', this.#id + 0.6, text, position) as Promise<Omit<Location, 'uri'>[] | undefined>;
	}

	/** @implements */
	resolveRenameLocation(text: string, position: Position): Promise<Range | undefined> {
		return wikiparse.provide('renameLocation', this.#id + 0.7, text, position) as Promise<Range | undefined>;
	}

	/** @implements */
	provideRenameEdits(text: string, position: Position, newName: string): Promise<WorkspaceEdit | undefined> {
		return wikiparse
			.provide('renameEdits', this.#id + 0.8, text, position, newName) as Promise<WorkspaceEdit | undefined>;
	}
}

wikiparse.LanguageService = LanguageService;
