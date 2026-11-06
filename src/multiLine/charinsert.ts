import {MultiLineToken} from './index';
import {CharinsertLineToken} from '../singleLine/charinsertLine';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER ONLY */

import {text} from '../../util/string';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import {html} from '../../util/html';
import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * `<charinsert>`
 * @classdesc `{childNodes: CharinsertLineToken[]}`
 */
export abstract class CharinsertToken extends MultiLineToken {
	declare readonly name: 'charinsert';

	declare readonly childNodes: readonly CharinsertLineToken[];
	abstract override get firstChild(): CharinsertLineToken | undefined;
	abstract override get lastChild(): CharinsertLineToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): CharinsertLineToken[];

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER ONLY */

	/** @private */
	override text(): string {
		return text(this.childNodes, '\n').trim();
	}

	/* NOT FOR BROWSER ONLY END */

	/* NOT FOR BROWSER */

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		return html(this.childNodes, '<br>')
			.replaceAll(/^(?:<br>)+|(?<!<br>)(?:<br>)+$/gu, '');
	}
}
