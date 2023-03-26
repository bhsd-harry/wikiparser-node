declare global {
	class Printer {
		include: boolean;
	}

	class Linter {
		constructor(include: boolean);
		queue(wikitext: string): Promise<LintError[]>;
	}

	interface wikiparse {
		MAX_STAGE: number;
		id: number;
		config: ParserConfig;
		edit: (textbox: HTMLTextAreaElement, include: boolean) => Printer;
		print: (wikitext: string, include: boolean, stage: number) => Promise<[number, string, string][]>;
		lint: (wikitext: string, include: boolean) => Promise<LintError[]>;
		highlight: (ele: HTMLElement, linenums: boolean, start: number) => Promise<void>;
		setConfig: (config: ParserConfig) => void;
		getConfig: () => Promise<ParserConfig>;
		setI18N: (i18n: Record<string, string>) => void;
		Printer: typeof Printer;
		Linter: typeof Linter;
	}
}

export {};
