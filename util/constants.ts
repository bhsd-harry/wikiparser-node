export type TokenTypes = 'root'
	| 'plain'
	| 'onlyinclude'
	| 'noinclude'
	| 'include'
	| 'comment'
	| 'ext'
	| 'ext-attrs'
	| 'ext-attr-dirty'
	| 'ext-attr'
	| 'attr-key'
	| 'attr-value'
	| 'ext-inner'
	| 'arg'
	| 'arg-name'
	| 'arg-default'
	| 'hidden'
	| 'magic-word'
	| 'magic-word-name'
	| 'invoke-function'
	| 'invoke-module'
	| 'template'
	| 'template-name'
	| 'parameter'
	| 'parameter-key'
	| 'parameter-value'
	| 'heading'
	| 'heading-title'
	| 'heading-trail'
	| 'html'
	| 'html-attrs'
	| 'html-attr-dirty'
	| 'html-attr'
	| 'table'
	| 'tr'
	| 'td'
	| 'table-syntax'
	| 'table-attrs'
	| 'table-attr-dirty'
	| 'table-attr'
	| 'table-inter'
	| 'td-inner'
	| 'hr'
	| 'double-underscore'
	| 'link'
	| 'link-target'
	| 'link-text'
	| 'category'
	| 'file'
	| 'gallery-image'
	| 'imagemap-image'
	| 'image-parameter'
	| 'quote'
	| 'ext-link'
	| 'ext-link-text'
	| 'ext-link-url'
	| 'free-ext-link'
	| 'list'
	| 'dd'
	| 'converter'
	| 'converter-flags'
	| 'converter-flag'
	| 'converter-rule'
	| 'converter-rule-variant'
	| 'converter-rule-to'
	| 'converter-rule-from'
	| 'param-line'
	| 'imagemap-link';

export const MAX_STAGE = 11;

/* NOT FOR BROWSER */

export const classes: Record<string, string> = {};

export const mixins: Record<string, string> = {};

export const parsers: Record<string, string> = {};

export const aliases = [
	['AstText'],
	['CommentToken', 'ExtToken', 'IncludeToken', 'NoincludeToken'],
	['ArgToken', 'TranscludeToken', 'HeadingToken'],
	['HtmlToken'],
	['TableToken'],
	['HrToken', 'DoubleUnderscoreToken'],
	['LinkToken', 'FileToken', 'CategoryToken'],
	['QuoteToken'],
	['ExtLinkToken'],
	['MagicLinkToken'],
	['ListToken', 'DdToken'],
	['ConverterToken'],
] as const;

export const typeAliases: Record<TokenTypes | 'text', string[] | undefined> = {
	text: ['string', 'str'],
	plain: ['regular', 'normal'],
	root: undefined,
	// comment and extension
	onlyinclude: ['only-include'],
	noinclude: ['no-include'],
	include: ['includeonly', 'include-only'],
	comment: undefined,
	ext: ['extension'],
	'ext-attrs': ['extension-attrs', 'ext-attributes', 'extension-attributes'],
	'ext-attr-dirty': ['extension-attr-dirty', 'ext-attribute-dirty', 'extension-attribute-dirty'],
	'ext-attr': ['extension-attr', 'ext-attribute', 'extension-attribute'],
	'attr-key': ['attribute-key'],
	'attr-value': ['attribute-value', 'attr-val', 'attribute-val'],
	'ext-inner': ['extension-inner'],
	// triple braces
	arg: ['argument'],
	'arg-name': ['argument-name'],
	'arg-default': ['argument-default'],
	hidden: ['arg-redundant'],
	// double braces
	'magic-word': ['parser-function', 'parser-func'],
	'magic-word-name': ['parser-function-name', 'parser-func-name'],
	'invoke-function': ['invoke-func', 'lua-function', 'lua-func', 'module-function', 'module-func'],
	'invoke-module': ['lua-module'],
	template: undefined,
	'template-name': undefined,
	parameter: ['param'],
	'parameter-key': ['param-key'],
	'parameter-value': ['parameter-val', 'param-value', 'param-val'],
	// heading
	heading: ['header'],
	'heading-title': ['header-title'],
	'heading-trail': ['header-trail'],
	// html
	html: undefined,
	'html-attrs': ['html-attributes'],
	'html-attr-dirty': ['html-attribute-dirty'],
	'html-attr': ['html-attribute'],
	// table
	table: undefined,
	tr: ['table-row'],
	td: ['table-cell', 'table-data'],
	'table-syntax': undefined,
	'table-attrs': ['tr-attrs', 'td-attrs', 'table-attributes', 'tr-attributes', 'td-attributes'],
	'table-attr-dirty':
		['tr-attr-dirty', 'td-attr-dirty', 'table-attribute-dirty', 'tr-attribute-dirty', 'td-attribute-dirty'],
	'table-attr': ['tr-attr', 'td-attr', 'table-attribute', 'tr-attribute', 'td-attribute'],
	'table-inter': undefined,
	'td-inner': ['table-cell-inner', 'table-data-inner'],
	// hr and double-underscore
	hr: ['horizontal'],
	'double-underscore': ['underscore', 'behavior-switch', 'behaviour-switch'],
	// link
	link: ['wikilink'],
	'link-target': ['wikilink-target'],
	'link-text': ['wikilink-text'],
	category: ['category-link', 'cat', 'cat-link'],
	file: ['file-link', 'image', 'image-link', 'img', 'img-link'],
	'gallery-image': ['gallery-file', 'gallery-img'],
	'imagemap-image': ['imagemap-file', 'imagemap-img', 'image-map-image', 'image-map-file', 'image-map-img'],
	'image-parameter': ['img-parameter', 'image-param', 'img-param'],
	// quotes
	quote: ['quotes', 'quot', 'apostrophe', 'apostrophes', 'apos'],
	// external link
	'ext-link': ['external-link'],
	'ext-link-text': ['external-link-text'],
	'ext-link-url': ['external-link-url'],
	// magic link
	'free-ext-link': ['free-external-link', 'magic-link'],
	// list
	list: ['ol', 'ordered-list', 'ul', 'unordered-list', 'dl', 'description-list'],
	dd: ['indent', 'indentation'],
	// converter
	converter: ['convert', 'conversion'],
	'converter-flags': ['convert-flags', 'conversion-flags'],
	'converter-flag': ['convert-flag', 'conversion-flag'],
	'converter-rule': ['convert-rule', 'conversion-rule'],
	'converter-rule-variant': ['convert-rule-variant', 'conversion-rule-variant'],
	'converter-rule-to': ['convert-rule-to', 'conversion-rule-to', 'converter-rule-noconvert'],
	'converter-rule-from': ['convert-rule-from', 'conversion-rule-from'],
	// specific extensions
	'param-line': ['parameter-line'],
	'imagemap-link': ['image-map-link'],
};

export const promises = [Promise.resolve()];
