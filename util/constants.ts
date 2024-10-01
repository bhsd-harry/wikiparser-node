import type {Token} from '../internal';

export const MAX_STAGE = 11;

export enum BuildMethod {
	String,
	Text,
}

export const stages = {
	redirect: 1,
	comment: 1,
	ext: 1,
	include: 1,
	noinclude: 1,
	arg: 2,
	template: 2,
	'magic-word': 2,
	heading: 2,
	html: 3,
	table: 4,
	hr: 5,
	'double-underscore': 5,
	link: 6,
	file: 6,
	category: 6,
	quote: 7,
	'ext-link': 8,
	'free-ext-link': 9,
	'magic-link': 9,
	list: 10,
	dd: 10,
	converter: 11,
};

/* NOT FOR BROWSER */

export const classes: Record<string, string> = {},
	mixins = classes,
	parsers = classes;

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

export const states = new WeakMap<Token, State>();
