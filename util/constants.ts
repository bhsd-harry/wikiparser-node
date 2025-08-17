import type {ConfigData} from '../index';

export const MAX_STAGE = 11;

export enum BuildMethod {
	String,
	Text,
}
export const minConfig: ConfigData = require('../config/minimum'),
	en = require('../i18n/en.json');

