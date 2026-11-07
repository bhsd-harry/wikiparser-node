declare global {
	type WikiParserAcceptable =
		Record<
			string,
			number
			| string
			| (number | string)[]
		>;

	type AstConstructor = abstract new (...args: any[]) => {
		text(separator?: string): string;
	};
}

export {};
