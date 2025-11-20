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
