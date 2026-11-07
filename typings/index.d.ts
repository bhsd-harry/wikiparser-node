import type {

	/* NOT FOR BROWSER */

	RenderOpt,
} from '../base';
import type {
	AstNodes,

	/* NOT FOR BROWSER */

	Token,
} from '../internal';

declare global {
	type WikiParserAcceptable =
		Record<string, number | string | (number | string)[]>;

	type AstConstructor = abstract new (...args: any[]) => {
		readonly name?: string | undefined;
		readonly childNodes: readonly AstNodes[];
		readonly firstChild: AstNodes | undefined;
		getAttribute<T extends string>(key: T): TokenAttribute<T>;
		toString(skip?: boolean, separator?: string): string;
		text(separator?: string): string;

		/* NOT FOR BROWSER */

		readonly parentNode: Token | undefined;
		afterBuild(): void;
		insertAt(token: unknown, i?: number): unknown;
		setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void;
		safeReplaceChildren(elements: readonly (AstNodes | string)[]): void;
		toHtmlInternal(opt?: HtmlOpt): string;
	};

	type Cached<T> = [number, T];

	/* NOT FOR BROWSER */

	interface RefState {
		name?: string;
		content?: Token;
		dir?: 'ltr' | 'rtl' | undefined;
		count: number;
		id: number;
	}
	interface State {
		headings: Set<string>;
		categories: Set<string>;
		refs: Map<string, {referencesGroup: RefState[], follows: {content: Token}[]}> & {id: number};
	}

	/** 注意`nocc`只用于`HeadingToken.id` */
	interface HtmlOpt {
		readonly nowrap?: boolean | undefined;
		readonly nocc?: boolean | undefined;
		removeBlank?: boolean | undefined;
		render?: RenderOpt | undefined;
	}

	type PlainOpt = Pick<HtmlOpt, 'nowrap'>;

	type Method = 'toHtmlInternal';

	type HtmlOrPlainFunc = (childNodes: readonly AstNodes[], separator: string, opt?: HtmlOpt) => string;
}
