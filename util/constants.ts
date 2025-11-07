export const MAX_STAGE = 11;

export enum BuildMethod {
	String,
	Text,
}

export const enMsg = /* #__PURE__ */ (() => {
	// eslint-disable-next-line n/no-missing-require
	LSP: return require('../../i18n/en.json');
})();

/* NOT FOR BROWSER ONLY */

export const mathTags = new Set(['math', 'chem', 'ce']);
