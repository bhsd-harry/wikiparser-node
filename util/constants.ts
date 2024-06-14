export const MAX_STAGE = 11;

export enum BuildMethod {
	String,
	Text,
}

/* NOT FOR BROWSER */

export const classes: Record<string, string> = {},
	mixins: Record<string, string> = {},
	parsers: Record<string, string> = {};

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
];
