import {ListBaseToken} from './listBase';
import type {SolTokenBase} from '../../mixin/sol';

/** 位于行首的`;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListToken extends sol(ListBaseToken) implements SolTokenBase {
	override readonly type = 'list';
}
