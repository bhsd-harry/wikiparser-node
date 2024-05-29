import type {Ranges} from '../lib/ranges';
import type {Config, LintError} from '../base';
import type {AstNodes} from '../lib/node';

declare global {
	type Acceptable = Record<string, number | string | Ranges | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		toString(separator?: string): string;
		text(separator?: string): string;
		lint(): LintError[];

		/* NOT FOR BROWSER */

		insertAt(token: unknown, i?: number): unknown;
		getAttribute<T extends string>(key: T): TokenAttributeGetter<T>;
		setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): void;
		addEventListener(events: string | string[], listener: (...args: any[]) => void): void;
		replaceChildren(...elements: (AstNodes | string)[]): void;
		constructorError(msg: string): never;
		seal(key: string, permanent?: boolean): void;
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

	/* NOT FOR BROWSER */

	interface ParsingError {
		readonly stage: number;
		readonly include: boolean;
		readonly config: Config;
	}
}

export {};
