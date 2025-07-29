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
 * a more sophisticated string-explode function
 * @param str string to be exploded
 */
const explode = (str?: string): string[] => {
	if (str === undefined) {
		return [];
	}
	const regex = /-\{|\}-|\|/gu,
		exploded: string[] = [];
	let mt = regex.exec(str),
		depth = 0,
		lastIndex = 0;
	while (mt) {
		const {0: match, index} = mt;
		if (match !== '|') {
			depth += match === '-{' ? 1 : -1;
		} else if (depth === 0) {
			exploded.push(str.slice(lastIndex, index));
			({lastIndex} = regex);
		}
		mt = regex.exec(str);
	}
	exploded.push(str.slice(lastIndex));
	return exploded;
};

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
		this.safeAppend(explode(text).map(
			// @ts-expect-error abstract class
			(part): ImageParameterToken => new ImageParameterToken(part, config, accum),
		));
	}
}
