import {ListBaseToken} from './listBase';
import type {SolTokenBase} from '../../mixin/sol';

/** 位于行首的`;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListToken extends ListBaseToken {
	override readonly type = 'list';
}
