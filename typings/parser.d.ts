import type {AstElement} from '../lib/element';
import type {Token} from '../internal';

declare global {
	type log = (msg: string, ...args: unknown[]) => void;

	type TokenPredicate<T = Token> = (token: AstElement) => token is T;

	interface BraceExecArray extends RegExpExecArray {
		parts?: string[][];
		findEqual?: boolean;
		pos?: number;
	}

	type BraceExecArrayOrEmpty = Partial<BraceExecArray>;

	/* NOT FOR BROWSER */

	interface SelectorArray extends Array<
		string
		| [string, string]
		| [string, string | undefined, string | undefined, string | undefined]
	> {
		relation?: string;
	}
}
