import {sol} from '../../mixin/sol';
import Parser from '../../index';
import {DdToken} from './dd';

/** 位于行首的`;:*#` */
export abstract class ListToken extends sol(DdToken) {
	/** @browser */
	override readonly type = 'list';
}

Parser.classes['ListToken'] = __filename;
