/* NOT FOR BROWSER */

import type {Token} from '../internal';

/* NOT FOR BROWSER END */

export const MAX_STAGE = 11;

export enum BuildMethod {
	String,
	Text,
}

// eslint-disable-next-line n/no-missing-require
export const enMsg = /* #__PURE__ */ (() => require('../../i18n/en.json'))();

/* NOT FOR BROWSER ONLY */

export const mathTags = new Set(['math', 'chem', 'ce']);

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

export const classes: Record<string, string> = {},
	mixins = classes,
	parsers = classes;

export const aliases = [
	['AstText'],
	['CommentToken', 'ExtToken', 'IncludeToken', 'NoincludeToken', 'TranslateToken'],
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
