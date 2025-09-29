import {Token} from './index';
import type {ParamTagToken} from '../internal';

/**
 * parameter of certain extension tags
 *
 * 某些扩展标签的参数
 */
export abstract class ParamLineToken extends Token {
	abstract override get parentNode(): ParamTagToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): this | undefined;

	override get type(): 'param-line' {
		return 'param-line';
	}
}
