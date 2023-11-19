import {sol} from '../../mixin/sol';
import * as Parser from '../../index';
import {DdToken} from './dd';

/** 位于行首的`;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListToken extends sol(DdToken) {
	/** @browser */
	override readonly type = 'list';
}

Parser.classes['ListToken'] = __filename;
