import * as path from 'path';
import type {Position} from 'vscode-languageserver-types';
import type {TextDocument} from 'vscode-languageserver-textdocument';
import type {
	LanguageService as JSONLanguageService,
	JSONDocument,
	SchemaConfiguration,
} from 'vscode-json-languageservice';
import type {LanguageService as CSSLanguageService, Stylesheet} from 'vscode-css-languageservice';
import type {Token, AttributeToken} from '../internal';

export const jsonTags = ['templatedata', 'mapframe', 'maplink'];

let jsonLSP: JSONLanguageService | undefined,
	cssLSP: CSSLanguageService | undefined;
try {
	jsonLSP = (require('vscode-json-languageservice') as typeof import('vscode-json-languageservice'))
		.getLanguageService({
			/** @implements */
			async schemaRequestService(uri) {
				return (await fetch(uri)).text(); // eslint-disable-line n/no-unsupported-features/node-builtins
			},
		});
	jsonLSP.configure({
		schemas: jsonTags.map((tag): SchemaConfiguration | false => {
			const uri = path.join('..', '..', 'data', 'ext', tag);
			try {
				const schema = require(uri);
				return {
					uri,
					fileMatch: [tag],
					schema,
				};
			} catch {
				return false;
			}
		}).filter(Boolean) as SchemaConfiguration[],
	});
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
	#pre;
	#post;

	/**
	 * @param id language ID
	 * @param root root token
	 * @param token current token
	 * @param pre padding before the content
	 * @param post padding after the content
	 */
	constructor(id: string, root: Token, token: Token, pre = '', post = '') {
		this.languageId = id;
		this.lineCount = root.getLines().length;
		this.#root = root;
		this.#content = String(token);
		this.#offset = token.getAbsoluteIndex();
		this.#pre = pre;
		this.#post = post;
	}

	/** 原始文本 */
	getContent(): string {
		return this.#content;
	}

	/** @implements */
	getText(): string {
		return this.#pre + this.getContent() + this.#post;
	}

	/** @implements */
	positionAt(offset: number): Position {
		const {top, left} = this.#root.posFromIndex(
			this.#offset + Math.max(Math.min(offset - this.#pre.length, this.#content.length), 0),
		)!;
		return {line: top, character: left};
	}

	/** @implements */
	offsetAt({line, character}: Position): number {
		return Math.min(Math.max(this.#root.indexFromPos(line, character)! - this.#offset, 0), this.#content.length)
			+ this.#pre.length;
	}
}

/** embedded JSON document */
export class EmbeddedJSONDocument extends EmbeddedDocument {
	declare jsonDoc: JSONDocument;

	/**
	 * @param root root token
	 * @param token current token
	 */
	constructor(root: Token, token: Token) {
		super('json', root, token);
		this.uri = token.name!;
		this.jsonDoc = jsonLSP!.parseJSONDocument(this);
	}
}

/** embedded CSS document */
export class EmbeddedCSSDocument extends EmbeddedDocument {
	declare styleSheet: Stylesheet;

	/**
	 * @param root root token
	 * @param token current token
	 */
	constructor(root: Token, token: Token) {
		const {type, tag} = token.parentNode as AttributeToken;
		super('css', root, token, `${type === 'ext-attr' ? 'div' : tag}{`, '}');
		this.styleSheet = cssLSP!.parseStylesheet(this);
	}

	/** @override */
	override getContent(): string {
		return super.getContent().replaceAll('{', '「')
			.replaceAll('}', '」');
	}
}
