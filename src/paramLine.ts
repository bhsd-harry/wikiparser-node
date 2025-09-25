import {Token} from './index';

/**
 * parameter of certain extension tags
 *
 * 某些扩展标签的参数
 */
export class ParamLineToken extends Token {
	override get type(): 'param-line' {
		return 'param-line';
	}
}
