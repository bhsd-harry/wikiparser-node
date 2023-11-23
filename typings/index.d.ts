declare global {
	interface PrintOpt {
		pre?: string;
		post?: string;
		sep?: string;
		class?: string;
	}

	type Acceptable = Record<string, number | string | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		toString(omit?: Set<string>, separator?: string): string;
		text(separator?: string): string;
	};

	type BoundingRect = {top: number, left: number, start: number} | {start: number};
}

export {};
