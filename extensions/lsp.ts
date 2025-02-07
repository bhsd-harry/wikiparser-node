import type {
	LanguageServiceBase,
	ColorInformation,
	ColorPresentation,
	CompletionItem,
	Position,
	FoldingRange,
	DocumentLink,
} from './typings';

/** 用于语法分析 */
class LanguageService implements LanguageServiceBase {
	readonly #id;

	constructor() {
		this.#id = wikiparse.id++;
	}

	/** @implements */
	provideDocumentColors(text: string): Promise<ColorInformation[]> {
		return wikiparse.provide('documentColors', this.#id + 0.1, text) as Promise<ColorInformation[]>;
	}

	/** @implements */
	provideColorPresentations(color: ColorInformation): Promise<ColorPresentation[]> {
		return wikiparse.provide('colorPresentations', this.#id + 0.2, color) as Promise<ColorPresentation[]>;
	}

	/** @implements */
	provideCompletionItems(text: string, position: Position): Promise<CompletionItem[] | null> {
		return wikiparse.provide('completionItems', this.#id + 0.3, text, position) as Promise<CompletionItem[] | null>;
	}

	/** @implements */
	provideFoldingRanges(text: string): Promise<FoldingRange[]> {
		return wikiparse.provide('foldingRanges', this.#id + 0.4, text) as Promise<FoldingRange[]>;
	}

	/** @implements */
	provideLinks(text: string): Promise<DocumentLink[]> {
		return wikiparse.provide('links', this.#id + 0.5, text) as Promise<DocumentLink[]>;
	}
}

wikiparse.LanguageService = LanguageService;
