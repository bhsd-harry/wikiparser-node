import {generateForChild} from '../util/lint';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';
import type {
	AstText,
	CommentToken,
	IncludeToken,
	NoincludeToken,
	TranscludeToken,
} from '../internal';

/**
 * 自由外链
 * @classdesc `{childNodes: ...AstText|CommentToken|IncludeToken|NoincludeToken}`
 */
export class MagicLinkToken extends Token {
	declare type: 'free-ext-link' | 'ext-link-url';

	declare readonly childNodes: readonly (AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AstText | TranscludeToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken;

	/**
	 * @param url 网址
	 * @param doubleSlash 是否接受"//"作为协议
	 */
	constructor(url?: string, doubleSlash = false, config = Parser.getConfig(), accum: Token[] = []) {
		super(url, config, accum, {
		});
		this.type = doubleSlash ? 'ext-link-url' : 'free-ext-link';
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
		let rect: BoundingRect | undefined;
		for (const child of this.childNodes) {
			const {type, data} = child;
			if (type !== 'text' || !regex.test(data)) {
				continue;
			}
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			const refError = generateForChild(child, rect, '', 'warning');
			regexGlobal.lastIndex = 0;
			for (let mt = regexGlobal.exec(data); mt; mt = regexGlobal.exec(data)) {
				const {index, 0: s} = mt,
					lines = data.slice(0, index).split('\n'),
					{length: top} = lines,
					{length: left} = lines[lines.length - 1]!,
					startIndex = refError.startIndex + index,
					startLine = refError.startLine + top - 1,
					startCol = top === 1 ? refError.startCol + left : left;
				errors.push({
					...refError,
					message: Parser.msg('$1 in URL', s.startsWith('|') ? '"|"' : Parser.msg('full-width punctuation')),
					startIndex,
					endIndex: startIndex + s.length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + s.length,
				});
			}
		}
		return errors;
	}
}
