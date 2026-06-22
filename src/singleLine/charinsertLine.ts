import {SingleLineToken} from './index';
import {ExtToken} from '../tagPair/ext';
import type {Config} from '../../base';
import type {Token, CharinsertToken, AstText} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	abstract override get children(): ExtToken[];
	abstract override get firstElementChild(): ExtToken | undefined;
	abstract override get lastElementChild(): ExtToken | undefined;
	abstract override get parentElement(): CharinsertToken | undefined;
	abstract override get previousElementSibling(): CharinsertLineToken | undefined;
	abstract override get nextElementSibling(): CharinsertLineToken | undefined;

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER ONLY */

	/** @private */
	override text(): string {
		const entities = {'\t': '&#9;', '\r': '&#12;', ' ': '&#32;'};
		return this.childNodes.map(
			child => child.type === 'text'
				? child.data
				: child.innerText!.replace(/[\t\r ]/gu, c => entities[c as '\t' | '\r' | ' ']),
		).join('').trim().replace(/\n+/gu, ' ');
	}

	/* NOT FOR BROWSER ONLY END */

	/* NOT FOR BROWSER */

	/**
	 * Get all insertion items in this line
	 *
	 * 获取此行的所有插入项
	 */
	getItems(): (string | [string, string])[] {
		return this.text().split(/\s+/u).map(item => {
			const parts = item.split('+', 2) as [string] | [string, string];
			if (parts.length === 1) {
				return parts[0];
			}
			return parts[0] ? parts : '+';
		});
	}
}

classes['CharinsertLineToken'] = __filename;
