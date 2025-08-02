import {LinkBaseToken} from './base';
import {ImageParameterToken} from '../imageParameter';
import type {
	Config,
} from '../../base';
import type {
	Token,
	AstText,
} from '../../internal';

/**
 * image
 *
 * 图片
 * @classdesc `{childNodes: [AstText, ...ImageParameterToken[]]}`
 */
export abstract class FileToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AstText, ...ImageParameterToken[]];
	abstract override get lastChild(): AstText | ImageParameterToken;

	/**
	 * @param link 文件名
	 * @param text 图片参数
	 * @param delimiter `|`
	 */
	constructor(link: string, text?: string, config?: Config, accum: Token[] = [], delimiter = '|') {
		super(link, undefined, config, accum, delimiter);
		if (text !== undefined) {
			// @ts-expect-error abstract class
			this.append(new ImageParameterToken(text, config, accum) as ImageParameterToken);
		}
	}
}
