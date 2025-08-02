import {Token} from './index';
import type {
	AtomToken,
	FileToken,
} from '../internal';

/**
 * image parameter
 *
 * 图片参数
 */
export abstract class ImageParameterToken extends Token {
	abstract override get parentNode(): FileToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	override get type(): 'image-parameter' {
		return 'image-parameter';
	}
}
