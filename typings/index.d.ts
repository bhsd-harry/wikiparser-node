import type {
	LintError,

	/* NOT FOR BROWSER */

	Config,
} from '../base';
import type {
	AstNodes,

	/* NOT FOR BROWSER */

	Token,
} from '../internal';

/* NOT FOR BROWSER */

import type {Ranges} from '../lib/ranges';

/* NOT FOR BROWSER END */

declare global {
	type WikiParserAcceptable = Record<string, number | string | Ranges | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		readonly childNodes: readonly AstNodes[];
		getAttribute<T extends string>(key: T): TokenAttribute<T>;
		toString(skip?: boolean, separator?: string): string;
		text(separator?: string): string;
		lint(): LintError[];
		print(opt?: PrintOpt): string;

		/* NOT FOR BROWSER */

		readonly parentNode: Token | undefined;
		afterBuild(): void;
		insertAt(token: unknown, i?: number): unknown;
		setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void;
		addEventListener(events: string | string[], listener: (...args: any[]) => void): void;
		safeReplaceChildren(elements: readonly (AstNodes | string)[]): void;
		constructorError(msg: string): never;
		seal(key: string, permanent?: boolean): void;
		toHtmlInternal(opt?: HtmlOpt): string;
	};

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

	interface State {
		headings: Set<string>;
	}

	/** 注意`nocc`只用于`HeadingToken.id` */
	interface HtmlOpt {
		readonly nowrap?: boolean | undefined;
		readonly nocc?: boolean | undefined;
	}
}

export {};
