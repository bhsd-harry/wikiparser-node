declare global {
	type Acceptable = unknown;

	type AstConstructor = abstract new (...args: any[]) => {
		toString(separator?: string): string;
		text(separator?: string): string;
	};

	interface BoundingRect {
		readonly top: number;
		readonly left: number;
		readonly start: number;
	}

	interface PrintOpt {
		readonly pre?: string;
		readonly post?: string;
		readonly sep?: string;
		readonly class?: string;
	}
}

export {};
