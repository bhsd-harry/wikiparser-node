import {generateForChild} from '../util/lint';
import Parser from '../index';
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
export abstract class MagicLinkToken extends Token {
	declare type: 'free-ext-link' | 'ext-link-url' | 'magic-link';

	declare readonly childNodes: readonly (AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstChild(): AstText | TranscludeToken;
	abstract override get lastChild(): AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken;

	/**
	 * @param url 网址
	 * @param type 类型
	 */
	constructor(
		url?: string,
		type: 'ext-link-url' | 'free-ext-link' | 'magic-link' = 'free-ext-link',
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(url, config, accum, {
		});
		this.type = type;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		if (this.type === 'magic-link') {
			return errors;
		}
		const source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
		let rect: BoundingRect | undefined;
		for (const child of this.childNodes) {
			const {type, data} = child;
			if (type !== 'text' || !regex.test(data)) {
				continue;
			}
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			const refError = generateForChild(child, rect, 'unterminated-url', '', 'warning');
			regexGlobal.lastIndex = 0;
			for (let mt = regexGlobal.exec(data); mt; mt = regexGlobal.exec(data)) {
				const {index, 0: s} = mt,
					lines = data.slice(0, index).split('\n'),
					top = lines.length,
					left = lines[top - 1]!.length,
					startIndex = refError.startIndex + index,
					startLine = refError.startLine + top - 1,
					startCol = top === 1 ? refError.startCol + left : left,
					pipe = s.startsWith('|');
				const e = {
					...refError,
					message: Parser.msg('$1 in URL', pipe ? '"|"' : 'full-width punctuation'),
					startIndex,
					endIndex: startIndex + s.length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + s.length,
				};
				if (!pipe) {
					e.suggestions = [
						{
							desc: 'whitespace',
							range: [startIndex, startIndex],
							text: ' ',
						},
						{
							desc: 'escape',
							range: [startIndex, e.endIndex],
							text: encodeURI(s),
						},
					];
				} else if (s.length === 1) {
					e.suggestions = [
						{
							desc: 'whitespace',
							range: [startIndex, startIndex + 1],
							text: ' ',
						},
					];
				}
				errors.push(e);
			}
		}
		return errors;
	}
}
