import {generateForSelf} from '../../util/lint';
import {hiddenToken} from '../../mixin/hidden';
import * as Parser from '../../index';
import {TagPairToken} from './index';
import type {LintError} from '../../base';
import type {AstText, Token} from '../../internal';

/**
 * `<includeonly>`或`<noinclude>`或`<onlyinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
export abstract class IncludeToken extends hiddenToken(TagPairToken) {
	override readonly type = 'include';

	declare readonly childNodes: readonly [AstText, AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 */
	constructor(
		name: string,
		attr = '',
		inner?: string,
		closed?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(name, attr, inner ?? '', inner === undefined ? closed : closed ?? '', config, accum);
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return this.closed ? [] : [generateForSelf(this, {start}, Parser.msg('unclosed $1', `<${this.name}>`))];
	}

	/** @override */
	override json(): object {
		return {
			...super.json(),
			closed: this.closed,
		};
	}
}
