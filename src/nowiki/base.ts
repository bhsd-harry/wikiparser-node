import {noEscape} from '../../mixin/noEscape';
import {Token} from '../index';
import type {Config} from '../../base';
import type {AstText} from '../../internal';

declare type NowikiTypes = 'ext-inner'
	| 'comment'
	| 'dd'
	| 'double-underscore'
	| 'hr'
	| 'list'
	| 'noinclude'
	| 'quote';

/**
 * text-only token that will not be parsed
 *
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
@noEscape
export abstract class NowikiBaseToken extends Token {
	abstract override get type(): NowikiTypes;
	declare readonly childNodes: readonly [AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;

	/** text content / 纯文本部分 */
	get innerText(): string {
		return this.firstChild.data;
	}

	/** @param wikitext default: `''` */
	constructor(wikitext = '', config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
	}
}
