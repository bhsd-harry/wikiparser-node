import {text} from '../../util/string';
import {MultiLineToken} from './index';
import {CharinsertLineToken} from '../singleLine/charinsertLine';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/**
 * `<charinsert>`
 * @classdesc `{childNodes: CharinsertLineToken[]}`
 */
export abstract class CharinsertToken extends MultiLineToken {
	declare readonly name: 'charinsert';

	declare readonly childNodes: readonly CharinsertLineToken[];
	abstract override get firstChild(): CharinsertLineToken | undefined;
	abstract override get lastChild(): CharinsertLineToken | undefined;

	/** @class */
	constructor(wikitext: string | undefined, config: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
			SingleLineToken: ':',
		});
		if (wikitext) {
			this.safeAppend(
				wikitext.split('\n')
					// @ts-expect-error abstract class
					.map((line): CharinsertLineToken => new CharinsertLineToken(line, config, accum)),
			);
		}
	}

	/** @private */
	override text(): string {
		return text(this.childNodes, '\n').trim();
	}
}
