import * as Parser from '../../index';
import {ListBaseToken} from './listBase';

/** `:` */
// @ts-expect-error not implementing all abstract methods
export class DdToken extends ListBaseToken {
	override readonly type = 'dd';
}

Parser.classes['DdToken'] = __filename;
