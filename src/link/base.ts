import {
	text,
} from '../../util/string';
import Parser from '../../index';
import {Token} from '../index';
import type {
	AstText as AtomToken,
} from '../../internal';

/**
 * internal link
 *
 * 内链
 */
export abstract class LinkBaseToken extends Token {
	#delimiter;

	abstract override get type(): 'gallery-image'
		| 'imagemap-image';
	abstract override get firstChild(): AtomToken;

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText?: string, config = Parser.getConfig(), accum: Token[] = [], delimiter = '|') {
		super(undefined, config, accum, {
		});
		this.insertAt(
			link,
		);
		this.#delimiter = delimiter;
	}

	/** @private */
	override toString(skip?: boolean): string {
		const str = super.toString(skip, this.#delimiter);
		return str;
	}

	/** @private */
	override text(): string {
		const {
				length,
				firstChild,
				childNodes,
			} = this,
			target = firstChild.text();
		let str: string;
		// eslint-disable-next-line unicorn/prefer-ternary
		if (length === 1) {
			str =
				target.trim();
		} else {
			str = `${target.trim()}|${
				text(
					childNodes.slice(1)
						.filter(({type: t, name}) => t !== 'image-parameter' || name !== 'invalid'),
					'|',
				)
			}`;
		}
		return str;
	}
}
