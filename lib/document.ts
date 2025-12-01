import path from 'path';
import {sanitizeInlineStyle} from '@bhsd/common';
import type {Position} from 'vscode-languageserver-types';
import type {TextDocument} from 'vscode-languageserver-textdocument';
import type {
	JSONDocument,
	SchemaConfiguration,
	LanguageService as JSONLanguageService,
} from 'vscode-json-languageservice';
import type {Stylesheet, LanguageService as CSSLanguageService} from 'vscode-css-languageservice';
import type {IHTMLDataProvider} from 'vscode-html-languageservice';
import type {PublicApi} from 'stylelint';
import type {Token, AttributeToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

export interface TexvcLocation {
	offset: number;
	line: number;
	column: number;
}
declare interface Texvcjs {
	check(input: string, options?: {usemhchem?: boolean}): {
		status: '+';
	} | {
		status: 'C';
	} | {
		status: 'F' | 'S';
		error: {
			message: string;
			location: {
				start: TexvcLocation;
				end: TexvcLocation;
			};
		};
	};
}

let texcvjs: Texvcjs | undefined | null;
export const loadTexvcjs = /** @ignore */ (): Texvcjs | null => {
	NPM: {
		if (texcvjs === undefined) {
			try {
				texcvjs = require('mathoid-texvcjs') as Texvcjs;
			} catch {
				/* istanbul ignore next */
				texcvjs = null;
			}
		}
		return texcvjs;
	}
};

export const jsonTags = ['templatedata', 'mapframe', 'maplink'];

let jsonLSP: JSONLanguageService | undefined | null;
export const loadJsonLSP = /** @ignore */ (): JSONLanguageService | null => {
	if (jsonLSP === undefined) {
		try {
			jsonLSP = (require('vscode-json-languageservice') as typeof import('vscode-json-languageservice'))
				.getLanguageService({
					/** @implements */
					async schemaRequestService(uri) {
						return (await fetch(uri)).text();
					},
				});
			const dir = path.join('..', '..', 'data', 'ext');
			jsonLSP.configure({
				schemas: jsonTags.map((tag): SchemaConfiguration | false => {
					const uri = path.join(dir, tag);
					try {
						const schema = require(tag === 'maplink' ? path.join(dir, 'mapframe') : uri);
						return {
							uri,
							fileMatch: [tag],
							schema,
						};
					} catch {
						/* istanbul ignore next */
						return false;
					}
				}).filter(schema => schema !== false),
			});
		} catch {
			/* istanbul ignore next */
			jsonLSP = null;
		}
	}
	return jsonLSP;
};

let cssLSP: CSSLanguageService | undefined | null;
export const loadCssLSP = /** @ignore */ (): CSSLanguageService | null => {
	if (cssLSP === undefined) {
		try {
			cssLSP = (require('vscode-css-languageservice') as typeof import('vscode-css-languageservice'))
				.getCSSLanguageService();
		} catch {
			/* istanbul ignore next */
			cssLSP = null;
		}
	}
	return cssLSP;
};

let htmlData: IHTMLDataProvider | undefined | null;
export const loadHtmlData = /** @ignore */ (): IHTMLDataProvider | null => {
	if (htmlData === undefined) {
		try {
			htmlData = (require('vscode-html-languageservice') as typeof import('vscode-html-languageservice'))
				.getDefaultHTMLDataProvider();
		} catch {
			/* istanbul ignore next */
			htmlData = null;
		}
	}
	return htmlData;
};

let stylelint: Promise<PublicApi | null> | undefined;
export const loadStylelint = /** @ignore */ (): Promise<PublicApi | null> => {
	NPM: {
		stylelint ??= (async () => {
			try {
				return (await import('stylelint')).default;
			} catch {
				/* istanbul ignore next */
				return null;
			}
		})();
		return stylelint;
	}
};

/** embedded document */
class EmbeddedDocument implements TextDocument {
	declare languageId: string;
	declare lineCount: number;
	declare pre: string;
	uri = '';
	version = 0;
	#root;
	#content;
	#offset;
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
		this.#content = token.toString();
		this.#offset = token.getAbsoluteIndex();
		this.pre = pre;
		this.#post = post;
	}

	/** 原始文本 */
	getContent(): string {
		return this.#content;
	}

	/** @implements */
	getText(): string {
		return this.pre + this.getContent() + this.#post;
	}

	/** @implements */
	positionAt(offset: number): Position {
		const {top, left} = this.#root.posFromIndex(
			this.#offset + Math.max(Math.min(offset - this.pre.length, this.#content.length), 0),
		)!;
		return {line: top, character: left};
	}

	/** @implements */
	offsetAt({line, character}: Position): number {
		return Math.min(Math.max(this.#root.indexFromPos(line, character)! - this.#offset, 0), this.#content.length)
			+ this.pre.length;
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
		this.jsonDoc = loadJsonLSP()!.parseJSONDocument(this);
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
		this.styleSheet = loadCssLSP()!.parseStylesheet(this);
	}

	override getContent(): string {
		return sanitizeInlineStyle(super.getContent());
	}
}

classes['EmbeddedDocument'] = __filename;
