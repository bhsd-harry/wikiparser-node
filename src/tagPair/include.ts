import {generateForSelf, generateForChild, fixByRemove, fixByClose} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {hiddenToken} from '../../mixin/hidden';
import Parser from '../../index';
import {TagPairToken} from './index';
import type {LintError, Config} from '../../base';
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

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors: LintError[] = [],
			{firstChild, closed, name} = this,
			rect = new BoundingRect(this, start),
			rules = ['no-ignored', 'unclosed-comment'] as const,
			s = rules.map(rule => Parser.lintConfig.getSeverity(rule, 'include'));
		if (s[0] && firstChild.data.trim()) {
			const e = generateForChild(firstChild, rect, rules[0], 'useless-attribute', s[0]);
			e.suggestions = [fixByRemove(e)];
			errors.push(e);
		}
		if (s[1] && !closed) {
			const e = generateForSelf(this, rect, rules[1], Parser.msg('unclosed', `<${name}>`), s[1]);
			e.suggestions = [fixByClose(e.endIndex, `</${name}>`)];
			errors.push(e);
		}
		return errors;
	}
}
