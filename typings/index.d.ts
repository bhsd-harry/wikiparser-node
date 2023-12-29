declare global {
	interface PrintOpt {
		readonly pre?: string;
		readonly post?: string;
		readonly sep?: string;
		readonly class?: string;
	}

	type Acceptable = Record<string, number | string | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		toString(omit?: Set<string>, separator?: string): string;
		text(separator?: string): string;
	};

	type BoundingRect = {
		readonly top: number;
		readonly left: number;
		readonly start: number;
	} | {
		readonly start: number;
	};
}

export {};
