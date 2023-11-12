import type {Ranges} from '../lib/ranges';

declare global {
	interface PrintOpt {
		pre?: string;
		post?: string;
		sep?: string;
		class?: string;
	}

	type Acceptable = Record<string, number | string | Ranges | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		length: number;
		toString(selector?: string, separator?: string): string;
		text(separator?: string): string;
		insertAt(token: unknown, i?: number): unknown;
	};

	type BoundingRect = {top: number, left: number, start: number} | {start: number};
}
