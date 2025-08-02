import {LinkBaseToken} from './base';
import {ImageParameterToken} from '../imageParameter';
import type {
	Config,
} from '../../base';
import type {
	Token,
	AtomToken,
} from '../../internal';

/**
 * image
 *
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken[]]}`
 */
export abstract class FileToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken, ...ImageParameterToken[]];
	abstract override get lastChild(): AtomToken | ImageParameterToken;

	/**
	 * @param link 文件名
	 * @param text 图片参数
	 * @param delimiter `|`
	 */
	constructor(link: string, text?: string, config?: Config, accum: Token[] = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);
		// @ts-expect-error abstract class
		this.append(new ImageParameterToken(text, config, accum) as ImageParameterToken);
	}
}
