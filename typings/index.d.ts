import type {
	LintError,
} from '../base';
import type {AstNodes} from '../lib/node';

declare global {
	type Acceptable = unknown;

	type AstConstructor = abstract new (...args: any[]) => {
		readonly childNodes: readonly AstNodes[];
		toString(skip?: boolean, separator?: string): string;
		text(separator?: string): string;
		lint(): LintError[];
	};

	interface PrintOpt {
		readonly pre?: string;
		readonly post?: string;
		readonly sep?: string;
		readonly class?: string;
	}
}

export {};
