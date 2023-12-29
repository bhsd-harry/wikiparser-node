import type {Ranges} from '../lib/ranges';
import type {Config} from '../base';
import type {AstNodes} from '../lib/node';

declare global {
	interface PrintOpt {
		readonly pre?: string;
		readonly post?: string;
		readonly sep?: string;
		readonly class?: string;
	}

	type Acceptable = Record<string, number | string | Ranges | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		readonly length: number;
		toString(omit?: Set<string>, separator?: string): string;
		text(separator?: string): string;
		insertAt(token: unknown, i?: number): unknown;
		afterBuild(): void;
		getAttribute<T extends string>(key: T): TokenAttributeGetter<T>;
		setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): void;
		addEventListener(events: string | string[], listener: AstListener): void;
		replaceChildren(...elements: (AstNodes | string)[]): void;
	};

	type BoundingRect = {
		readonly top: number;
		readonly left: number;
		readonly start: number;
	} | {
		readonly start: number;
	};

	interface ParsingError {
		readonly stage: number;
		readonly include: boolean;
		readonly config: Config;
	}
}
