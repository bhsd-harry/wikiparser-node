export {default as enMsg} from '../i18n/en.json';

/* NOT FOR BROWSER */

import type {Token, FunctionHook, TagHook} from '../internal';

/* NOT FOR BROWSER END */

export const MAX_STAGE =
	11;

export const enum BuildMethod {
	String,
	Text,
}

export const galleryParams = new Set(['alt', 'link', 'lang', 'page', 'caption', 'class']);

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

export const states = new WeakMap<Token, State>();

export const functionHooks = new Map<string, FunctionHook>();

export const tagHooks = new Map<string, TagHook>();
