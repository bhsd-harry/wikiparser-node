declare type wikiparseFunc = (textbox: HTMLTextAreaElement, option?: {include: boolean}) => void;
declare global {
		interface wikiparse extends wikiparseFunc {
		parse: (wikitext: string, include: boolean, stage: number) => Promise<string[][]>;
		setConfig: (config: ParserConfig) => void;
	}
}

export {};
