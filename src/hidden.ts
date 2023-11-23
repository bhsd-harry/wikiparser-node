import {hidden} from '../mixin/hidden';
import * as Parser from '../index';
import {Token} from './index';

/** 不可见的节点 */
export class HiddenToken extends hidden(Token) {
	override readonly type = 'hidden';
}

Parser.classes['HiddenToken'] = __filename;
