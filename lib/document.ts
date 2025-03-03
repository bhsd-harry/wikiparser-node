import type {Position} from 'vscode-languageserver-types';
import type {TextDocument} from 'vscode-languageserver-textdocument';
import type {LanguageService as JSONLanguageService, JSONDocument} from 'vscode-json-languageservice';
import type {LanguageService as CSSLanguageService, Stylesheet} from 'vscode-css-languageservice';
import type {Token} from '../internal';

let jsonLSP: JSONLanguageService | undefined,
	cssLSP: CSSLanguageService | undefined;
try {
	jsonLSP = (require('vscode-json-languageservice') as typeof import('vscode-json-languageservice'))
		.getLanguageService({});
} catch {}
try {
	cssLSP = (require('vscode-css-languageservice') as typeof import('vscode-css-languageservice'))
		.getCSSLanguageService();
} catch {}
export {jsonLSP, cssLSP};

/** embedded document */
class EmbeddedDocument implements TextDocument {
	declare languageId: string;
	declare lineCount: number;
	uri = '';
	version = 0;
	#root;
	#content;
	#offset;
	#padding;

	/**
	 * @param id language ID
	 * @param root root token
	 * @param token current token
	 * @param padding strings to pad the content
	 */
	constructor(id: string, root: Token, token: Token, padding = ['', '']) {
		this.languageId = id;
		this.lineCount = root.getLines().length;
		this.#root = root;
		this.#content = padding[0] + String(token) + padding[1];
		this.#offset = token.getAbsoluteIndex();
		this.#padding = padding.map(({length}) => length) as [number, number];
	}

	/** @implements */
	getText(): string {
		return this.#content;
	}

	/** @implements */
	positionAt(offset: number): Position {
		const {top, left} = this.#root.posFromIndex(
			this.#offset + Math.max(Math.min(offset, this.#content.length - this.#padding[1]) - this.#padding[0], 0),
		)!;
		return {line: top, character: left};
	}

	/** @implements */
	offsetAt({line, character}: Position): number {
		return Math.min(
			Math.max(this.#root.indexFromPos(line, character)! - this.#offset, 0) + this.#padding[0],
			this.#content.length,
		);
	}
}

/** embedded JSON document */
export class EmbeddedJSONDocument extends EmbeddedDocument {
	declare schema: object | undefined;
	declare jsonDoc: JSONDocument;

	/**
	 * @param root root token
	 * @param token current token
	 */
	constructor(root: Token, token: Token, schema: object | undefined) {
		super('json', root, token);
		this.schema = schema;
		this.jsonDoc = jsonLSP!.parseJSONDocument(this);
	}
}

/** embedded CSS document */
export class EmbeddedCSSDocument extends EmbeddedDocument {
	declare styleSheet: Stylesheet;

	/**
	 * @param root root token
	 * @param token current token
	 * @param tag tag name
	 */
	constructor(root: Token, token: Token, tag: string) {
		super('css', root, token, [`${tag}{`, '}']);
		this.styleSheet = cssLSP!.parseStylesheet(this);
	}
}
