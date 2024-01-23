declare global {
	type Acceptable = Record<string, number | string | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		toString(omit?: Set<string>, separator?: string): string;
		text(separator?: string): string;
	};

	interface BoundingRect {
		readonly top: number;
		readonly left: number;
		readonly start: number;
	}
}

export {};
