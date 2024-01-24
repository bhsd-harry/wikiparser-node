import {ListBaseToken} from './listBase';

/** 位于行首的`;:*#` */
export abstract class ListToken extends sol(ListBaseToken) {
	override readonly type = 'list';
}
