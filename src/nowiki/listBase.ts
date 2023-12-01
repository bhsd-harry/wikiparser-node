import {syntax} from '../../mixin/syntax';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';

/** `;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListBaseToken extends syntax(NowikiBaseToken, /^[;:*#]+$/u) {
	declare type: 'dd' | 'list';
}

Parser.classes['ListBase'] = __filename;
