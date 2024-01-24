import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';
import {NowikiBaseToken} from './base';

/** `;:*#` */
export abstract class ListBaseToken extends syntax(NowikiBaseToken, /^[;:*#]+$/u) {
	declare type: 'dd' | 'list';
}

classes['ListBase'] = __filename;
