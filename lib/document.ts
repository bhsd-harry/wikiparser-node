import path from 'path';
import {sanitizeInlineStyle} from '@bhsd/common';
import type {Position} from 'vscode-languageserver-types';
import type {TextDocument} from 'vscode-languageserver-textdocument';
import type {JSONDocument, SchemaConfiguration} from 'vscode-json-languageservice';
import type {Stylesheet} from 'vscode-css-languageservice';
import type {Token, AttributeToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

declare interface Jax {
	tex2mml(tex: string): string;
}
declare interface mathjax {
	init(config: unknown): Promise<Jax>;
}

let MathJax: Promise<Jax> | undefined;

/**
 * Load MathJax
 * @param id MathJax module ID
 */
export const loadMathJax = (id = 'mathjax'): Promise<Jax> | undefined => {
	try {
		const jax: mathjax = require(id);
		MathJax ??= jax.init({
			loader: {
				load: ['input/tex', '[tex]/mhchem'],
			},
			tex: {
				packages: {'[+]': ['mhchem']},
				/** @ignore */
				formatError(_: unknown, error: unknown): never {
					throw error;
				},
			},
			startup: {typeset: false},
		});
		return MathJax;
	} catch {
		return undefined;
	}
};

export const jsonTags = ['templatedata', 'mapframe', 'maplink'];

export const jsonLSP = (() => {
	try {
		const lsp = (require('vscode-json-languageservice') as typeof import('vscode-json-languageservice'))
			.getLanguageService({
				/** @implements */
				async schemaRequestService(uri) {
					return (await fetch(uri)).text();
				},
			});
		lsp.configure({
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
		return lsp;
	} catch {
		return undefined;
	}
})();

export const cssLSP = (() => {
	try {
		return (require('vscode-css-languageservice') as typeof import('vscode-css-languageservice'))
			.getCSSLanguageService();
	} catch {
		return undefined;
	}
})();

export const htmlData = (() => {
	try {
		return (require('vscode-html-languageservice') as typeof import('vscode-html-languageservice'))
			.getDefaultHTMLDataProvider();
	} catch {
		return undefined;
	}
})();

export const stylelint = (async () => {
	try {
		return (await import('stylelint')).default;
	} catch {
		return undefined;
	}
})();

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
		this.#content = String(token);
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

	override getContent(): string {
		return sanitizeInlineStyle(super.getContent());
	}
}

classes['EmbeddedCSSDocument'] = __filename;
