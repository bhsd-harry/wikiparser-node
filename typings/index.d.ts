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
		Record<
			string,
			number
			| string
			| (number | string)[]
		>;

	type AstConstructor = abstract new (...args: any[]) => {
		readonly childNodes: readonly AstNodes[];
		text(separator?: string): string;

		/* NOT FOR BROWSER */

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

	type Method = 'toHtmlInternal'
	;

	type HtmlOrPlainFunc = (childNodes: readonly AstNodes[], separator: string, opt?: HtmlOpt) => string;
}
