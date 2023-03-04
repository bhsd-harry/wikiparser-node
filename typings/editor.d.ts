declare type wikiparseFunc = (textbox: HTMLTextAreaElement, include: boolean) => Printer;
declare global {
	class Printer {
		include: boolean;
	}

	class Linter {
		constructor(include: boolean);
		queue(wikitext: string): Promise<LintError[]>;
	}

	interface wikiparse extends wikiparseFunc {
		config: ParserConfig;
		print: (wikitext: string, include: boolean, stage: number) => Promise<string[][]>;
		lint: (wikitext: string, include: boolean) => Promise<LintError[]>;
		setConfig: (config: ParserConfig) => void;
		getConfig: () => Promise<ParserConfig>;
		setI18N: (i18n: Record<string, string>) => void;
		Printer: typeof Printer;
		Linter: typeof Linter;
	}
}

export {};
