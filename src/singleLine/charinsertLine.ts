import {SingleLineToken} from './index';
import {ExtToken} from '../tagPair/ext';
import type {Config} from '../../base';
import type {Token, CharinsertToken, AstText} from '../../internal';

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
		super(
			wikitext?.replace(/<(nowiki)>(.*?)<\/(nowiki)>/giu, (_, opening, content, closing) => {
				// @ts-expect-error abstract class
				new ExtToken(opening, undefined, content, closing, config, false, accum);
				return `\0${accum.length - 2}e\x7F`;
			}),
			config,
			accum,
		);
	}
}
