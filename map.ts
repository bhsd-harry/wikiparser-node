import type {TokenTypes} from './base';
import type {
	RedirectToken,
	RedirectTargetToken,
	OnlyincludeToken,
	IncludeToken,
	CommentToken,
	ExtToken,
	AttributesToken,
	AttributeToken,
	AtomToken,
	ArgToken,
	TranscludeToken,
	SyntaxToken,
	ParameterToken,
	HeadingToken,
	HtmlToken,
	TableToken,
	TrToken,
	TdToken,
	DoubleUnderscoreToken,
	HrToken,
	LinkToken,
	CategoryToken,
	FileToken,
	ImageParameterToken,
	QuoteToken,
	ExtLinkToken,
	MagicLinkToken,
	ListToken,
	DdToken,
	ConverterToken,
	ConverterFlagsToken,
	ConverterRuleToken,
	TranslateToken,
	TvarToken,
	HiddenToken,
	GalleryImageToken,
	ParamLineToken,
	ImagemapLinkToken,

	/* NOT FOR BROWSER */

	ListRangeToken,
} from './internal';

export interface TokenTypeMap {
	redirect: RedirectToken;
	'redirect-syntax': SyntaxToken;
	'redirect-target': RedirectTargetToken;
	translate: TranslateToken;
	'translate-attr': SyntaxToken;
	tvar: TvarToken;
	'tvar-name': SyntaxToken;
	onlyinclude: OnlyincludeToken;
	include: IncludeToken;
	comment: CommentToken;
	ext: ExtToken;
	'ext-attrs': AttributesToken;
	'ext-attr-dirty': AtomToken;
	'ext-attr': AttributeToken;
	'attr-key': AtomToken;
	arg: ArgToken;
	'arg-name': AtomToken;
	hidden: HiddenToken;
	'magic-word': TranscludeToken;
	'magic-word-name': SyntaxToken;
	'invoke-function': AtomToken;
	'invoke-module': AtomToken;
	template: TranscludeToken;
	'template-name': AtomToken;
	parameter: ParameterToken;
	heading: HeadingToken;
	'heading-trail': SyntaxToken;
	html: HtmlToken;
	'html-attrs': AttributesToken;
	'html-attr-dirty': AtomToken;
	'html-attr': AttributeToken;
	table: TableToken;
	tr: TrToken;
	td: TdToken;
	'table-syntax': SyntaxToken;
	'table-attrs': AttributesToken;
	'table-attr-dirty': AtomToken;
	'table-attr': AttributeToken;
	hr: HrToken;
	'double-underscore': DoubleUnderscoreToken;
	link: LinkToken;
	'link-target': AtomToken;
	category: CategoryToken;
	file: FileToken;
	'gallery-image': GalleryImageToken;
	'imagemap-image': GalleryImageToken;
	'image-parameter': ImageParameterToken;
	quote: QuoteToken;
	'ext-link': ExtLinkToken;
	'ext-link-url': MagicLinkToken;
	'free-ext-link': MagicLinkToken;
	'magic-link': MagicLinkToken;
	list: ListToken;
	dd: DdToken;
	converter: ConverterToken;
	'converter-flags': ConverterFlagsToken;
	'converter-flag': AtomToken;
	'converter-rule': ConverterRuleToken;
	'converter-rule-variant': AtomToken;
	'param-line': ParamLineToken;
	'imagemap-link': ImagemapLinkToken;

	/* NOT FOR BROWSER */

	'list-range': ListRangeToken;
}
export type SelectedTokenTypes = keyof TokenTypeMap;

// Ensure all keys in TokenTypeMap are valid token types
declare type AssertTrue<T extends TokenTypes> = T;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare type TokenTypeMapKeyCheck = AssertTrue<SelectedTokenTypes>;
