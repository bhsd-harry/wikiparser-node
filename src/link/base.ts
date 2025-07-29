import {Token} from '../index';
import {AtomToken} from '../atom';
import type {
	Config,
} from '../../base';

/**
 * internal link
 *
 * 内链
 * @classdesc `{childNodes: [AtomToken, ...Token[]]}`
 */
export abstract class LinkBaseToken extends Token {
	#delimiter;

	abstract override get type(): 'gallery-image' | 'imagemap-image';
	declare readonly childNodes: readonly [AtomToken, ...Token[]];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config?: Config, accum: Token[] = [], delimiter = '|') {
		super(undefined, config, accum, {
		});
		this.insertAt(new AtomToken(link, 'link-target', config, accum, {
		}));
		this.#delimiter = delimiter;
	}

	/** @private */
	override toString(skip?: boolean): string {
		const str = super.toString(skip, this.#delimiter);
		return str;
	}

	/** @private */
	override text(): string {
		const str = super.text('|');
		return str;
	}
}
