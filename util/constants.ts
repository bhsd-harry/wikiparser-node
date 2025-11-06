import type {ConfigData} from '../index';

export const MAX_STAGE = 11;

export enum BuildMethod {
	String,
	Text,
}

export const enMsg = /* #__PURE__ */ (() => {
	LSP: return require('../i18n/en.json');
})();
export const minConfig: ConfigData = require('../config/minimum');
