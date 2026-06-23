import type {
	LintError,
} from '../base';
import type {
	AstNodes,
} from '../internal';

declare global {
	type WikiParserAcceptable =
		unknown;

	type AstConstructor = abstract new (...args: any[]) => {
		readonly name?: string | undefined;
		readonly childNodes: readonly AstNodes[];
		readonly firstChild: AstNodes | undefined;
		getAttribute<T extends string>(key: T): TokenAttribute<T>;
		toString(skip?: boolean, separator?: string): string;
		text(separator?: string): string;
		lint(start?: number): LintError[];
		getAbsoluteIndex(): number;
		print(opt?: PrintOpt): string;
		lspError(method: string): never;
	};

	interface PrintOpt {
		readonly pre?: string;
		readonly post?: string;
		readonly sep?: string;
		readonly class?: string;
	}
}

export {};
