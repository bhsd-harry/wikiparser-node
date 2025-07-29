declare global {
	type Acceptable = unknown;

	type AstConstructor = abstract new (...args: any[]) => {
		toString(skip?: boolean, separator?: string): string;
		text(separator?: string): string;
	};
}

export {};
