import {Token} from '../index';
import type {
	Config,
} from '../../base';
import type {AstText} from '../../internal';

/**
 * internal link
 *
 * 内链
 * @classdesc `{childNodes: [AtomToken, ...Token[]]}`
 */
export abstract class LinkBaseToken extends Token {
	#delimiter;

	abstract override get type(): 'gallery-image' | 'imagemap-image';
	abstract override get firstChild(): AstText;

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config?: Config, accum: Token[] = [], delimiter = '|') {
		super(undefined, config, accum, {
		});
		this.insertAt(link);
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
