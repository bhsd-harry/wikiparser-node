import {generateForSelf, generateForChild} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {TagPairToken} from './index';
import type {LintError, Config} from '../../base';
import type {AstText, Token} from '../../internal';

/**
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

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors: LintError[] = [],
			{firstChild, closed, name} = this,
			rect = new BoundingRect(this, start);
		if (firstChild.data.trim()) {
			const e = generateForChild(firstChild, rect, 'no-ignored', 'useless attribute', 'warning');
			e.suggestions = [
				{
					desc: 'remove',
					range: [e.startIndex, e.endIndex],
					text: '',
				},
			];
			errors.push(e);
		}
		if (!closed) {
			const e = generateForSelf(this, rect, 'unclosed-comment', Parser.msg('unclosed $1', `<${name}>`));
			e.suggestions = [
				{
					desc: 'close',
					range: [e.endIndex, e.endIndex],
					text: `</${name}>`,
				},
			];
			errors.push(e);
		}
		return errors;
	}
}
