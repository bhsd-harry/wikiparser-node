import type {Ranges} from '../lib/ranges';

declare global {
	interface PrintOpt {
		readonly pre?: string;
		readonly post?: string;
		readonly sep?: string;
		readonly class?: string;
	}

	type Acceptable = Record<string, number | string | Ranges | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		toString(omit?: Set<string>, separator?: string): string;
		text(separator?: string): string;
	};

	type BoundingRect = {top: number, left: number, start: number} | {start: number};
}
