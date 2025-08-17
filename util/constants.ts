/* NOT FOR BROWSER */

import type {Token} from '../internal';

/* NOT FOR BROWSER END */

export const MAX_STAGE = 11;

export enum BuildMethod {
	String,
	Text,
}

export const enMsg = require('../../i18n/en.json'); // eslint-disable-line n/no-missing-require

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
