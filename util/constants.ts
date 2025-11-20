/* NOT FOR BROWSER */

import type {Token, TranscludeToken, ExtToken} from '../internal';

export type FunctionHook = (token: TranscludeToken, context?: TranscludeToken) => string;
export type TagHook = (token: ExtToken) => string;

/* NOT FOR BROWSER END */

export const MAX_STAGE = 11;

export enum BuildMethod {
	String,
	Text,
}

export const enMsg = /* #__PURE__ */ (() => {
	// eslint-disable-next-line n/no-missing-require
	LSP: return require('../../i18n/en.json');
})();

export const galleryParams = new Set(['alt', 'link', 'lang', 'page', 'caption']);

export const extensions = new Set(['tiff', 'tif', 'png', 'gif', 'jpg', 'jpeg', 'webp', 'xcf', 'pdf', 'svg', 'djvu']);

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

export const functionHooks = new Map<string, FunctionHook>();

export const tagHooks = new Map<string, TagHook>();
