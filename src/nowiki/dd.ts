import {ListBaseToken} from './listBase';

/** `:` */
// @ts-expect-error not implementing all abstract methods
export class DdToken extends ListBaseToken {
	override readonly type = 'dd';
}
