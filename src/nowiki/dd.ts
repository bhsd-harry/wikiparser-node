import {ListBaseToken} from './listBase';

/** `:` */
export abstract class DdToken extends ListBaseToken {
	override get type(): 'dd' {
		return 'dd';
	}
}
