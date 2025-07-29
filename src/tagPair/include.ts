import {hiddenToken} from '../../mixin/hidden';
import {TagPairToken} from './index';
import type {Config} from '../../base';
import type {AstText, Token} from '../../internal';

/**
 * `<includeonly>`, `<noinclude>` or `<onlyinclude>`
 *
 * `<includeonly>`或`<noinclude>`或`<onlyinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
@hiddenToken(false)
export abstract class IncludeToken extends TagPairToken {
	declare readonly childNodes: readonly [AstText, AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;

	override get type(): 'include' {
		return 'include';
	}

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 */
	constructor(name: string, attr = '', inner?: string, closed?: string, config?: Config, accum?: Token[]) {
		super(name, attr, inner ?? '', inner === undefined ? closed : closed ?? '', config, accum);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : super.toString();
	}
}
