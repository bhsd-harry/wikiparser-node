import {Shadow} from '../../util/debug';
import {syntax} from '../../mixin/syntax';
import {NowikiBaseToken} from './base';

/** `;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListBaseToken extends syntax(NowikiBaseToken, /^[;:*#]+$/u) {
	declare type: 'dd' | 'list';
}

Shadow.classes['ListBase'] = __filename;
