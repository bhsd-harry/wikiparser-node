import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';
import {NowikiBaseToken} from './base';

/** `;:*#` */
@syntax(/^[;:*#]+$/u)
export abstract class ListBaseToken extends NowikiBaseToken {
	declare type: 'dd' | 'list';
}

classes['ListBase'] = __filename;
