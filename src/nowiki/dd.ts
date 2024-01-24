import {ListBaseToken} from './listBase';

/** `:` */
export abstract class DdToken extends ListBaseToken {
	override readonly type = 'dd';
}
