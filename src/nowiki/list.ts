import {ListBaseToken} from './listBase';

/** 位于行首的`;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListToken extends sol(ListBaseToken) {
	override readonly type = 'list';
}
