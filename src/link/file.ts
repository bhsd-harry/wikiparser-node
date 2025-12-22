import {LinkBaseToken} from './base';
import {ImageParameterToken} from '../imageParameter';
import type {
	TokenTypes,
	Config,
} from '../../base';
import type {
	AstText as AtomToken,
	Token,
} from '../../internal';

/**
 * image
 *
 * 图片
 * @classdesc `{childNodes: [AstText, ...ImageParameterToken[]]}`
 */
export abstract class FileToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken, ...ImageParameterToken[]];
	abstract override get lastChild(): AtomToken | ImageParameterToken;

	/**
	 * @param link 文件名
	 * @param text 图片参数
	 * @param delimiter `|`
	 * @param type 节点类型
	 */
	constructor(link: string, text?: string, config?: Config, accum: Token[] = [], delimiter = '|', type?: TokenTypes) {
		super(link, undefined, config, accum, delimiter);
		if (text !== undefined) {
			// @ts-expect-error abstract class
			this.append(new ImageParameterToken(text, config, accum) as ImageParameterToken);
		}
	}
}
