import * as sol from '../../mixin/sol';
import * as Parser from '../../index';
import DdToken = require('./dd');

/** 位于行首的`;:*#` */
abstract class ListToken extends sol(DdToken) {
	/** @browser */
	override readonly type = 'list';
}

Parser.classes['ListToken'] = __filename;
export = ListToken;
