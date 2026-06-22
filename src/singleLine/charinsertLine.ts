import {SingleLineToken} from './index';
import {ExtToken} from '../tagPair/ext';
import type {Config} from '../../base';
import type {Token, CharinsertToken, AstText} from '../../internal';

const reNowiki = /<(nowiki)>(.*?)<\/(nowiki)>/giu;

/**
 * lines in `<charinsert>`
 *
 * `<charinsert>` 的行
 * @classdesc `{childNodes: (AstText | ExtToken)[]}`
 */
export abstract class CharinsertLineToken extends SingleLineToken {
	declare readonly childNodes: readonly (AstText | ExtToken)[];
	abstract override get firstChild(): AstText | ExtToken | undefined;
	abstract override get lastChild(): AstText | ExtToken | undefined;
	abstract override get parentNode(): CharinsertToken | undefined;
	abstract override get previousSibling(): CharinsertLineToken | undefined;
	abstract override get nextSibling(): CharinsertLineToken | undefined;

	override get type(): 'charinsert-line' {
		return 'charinsert-line';
	}

	/** @class */
	constructor(wikitext: string | undefined, config: Config, accum: Token[]) {
		super(undefined, config, accum, {
			AstText: ':', ExtToken: ':',
		});
		if (wikitext) {
			reNowiki.lastIndex = 0;
			let i = 0,
				mt = reNowiki.exec(wikitext);
			while (mt) {
				if (mt.index > i) {
					this.insertAt(wikitext.slice(i, mt.index));
				}
				// @ts-expect-error abstract class
				this.insertAt(new ExtToken(mt[1]!, undefined, mt[2]!, mt[3]!, config, false, accum));
				i = reNowiki.lastIndex;
				mt = reNowiki.exec(wikitext);
			}
			if (i < wikitext.length) {
				this.insertAt(wikitext.slice(i));
			}
		}
	}

	/** @private */
	override text(): string {
		return super.text().trim();
	}
}
