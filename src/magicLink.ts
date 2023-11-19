import {generateForChild} from '../util/lint';
import * as Parser from '../index';
import {Token} from '.';
import type {LintError} from '../index';

/**
 * 自由外链
 * @classdesc `{childNodes: ...AstText|CommentToken|IncludeToken|NoincludeToken}`
 */
export class MagicLinkToken extends Token {
	declare type: 'free-ext-link' | 'ext-link-url';

	/**
	 * @browser
	 * @param url 网址
	 * @param doubleSlash 是否接受"//"作为协议
	 */
	constructor(url?: string, doubleSlash = false, config = Parser.getConfig(), accum: Token[] = []) {
		super(url, config, true, accum, {
		});
		this.type = doubleSlash ? 'ext-link-url' : 'free-ext-link';
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
		let rect: BoundingRect | undefined;
		for (const child of this.childNodes) {
			if (child.type !== 'text' || !regex.test(child.data)) {
				continue;
			}
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			const {data} = child,
				refError = generateForChild(child, rect, '', 'warning');
			errors.push(...[...data.matchAll(regexGlobal)].map(({index, 0: s}) => {
				const lines = data.slice(0, index).split('\n'),
					{length: top} = lines,
					{length: left} = lines.at(-1)!,
					startIndex = start + index!,
					startLine = refError.startLine + top - 1,
					startCol = top === 1 ? refError.startCol + left : left;
				return {
					...refError,
					message: Parser.msg('$1 in URL', s.startsWith('|') ? '"|"' : Parser.msg('full-width punctuation')),
					startIndex,
					endIndex: startIndex + s.length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + s.length,
				};
			}));
		}
		return errors;
	}
}
