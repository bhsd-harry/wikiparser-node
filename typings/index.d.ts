import type {
	LintError,
} from '../base';

declare global {
	type Acceptable = Record<string, number | string | Ranges | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		toString(omit?: Set<string>, separator?: string): string;
		text(separator?: string): string;
		lint(start?: number): LintError[];
	};

	type BoundingRect = {
		readonly top: number;
		readonly left: number;
		readonly start: number;
	} | {
		readonly start: number;
	};
}
