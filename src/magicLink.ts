import {generateForChild, generateForSelf} from '../util/lint';
import {text} from '../util/string';
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

declare type ExtLinkTypes = 'free-ext-link' | 'ext-link-url' | 'magic-link';

const space = '(?:[\\p{Zs}\t]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)',
	spaceRegex = new RegExp(`${space}+`, 'gu');

/**
 * 自由外链
 * @classdesc `{childNodes: ...AstText|CommentToken|IncludeToken|NoincludeToken}`
 */
export abstract class MagicLinkToken extends Token {
	declare type: ExtLinkTypes;

	declare readonly childNodes: readonly (AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstChild(): AstText | TranscludeToken;
	abstract override get lastChild(): AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken;

	/** 和内链保持一致 */
	get link(): string {
		const map = {'!': '|', '=': '='};
		let link = text(this.childNodes.map(child => {
			const {type, name} = child;
			return type === 'magic-word' && String(name) in map ? map[name as keyof typeof map] : child;
		}));
		if (this.type === 'magic-link') {
			link = link.replace(spaceRegex, ' ');
			if (link.startsWith('ISBN')) {
				link = `ISBN ${link.slice(5).replace(/[- ]/gu, '').replace(/x$/u, 'X')}`;
			}
		}
		return link;
	}

	/**
	 * @param url 网址
	 * @param type 类型
	 */
	constructor(url?: string, type: ExtLinkTypes = 'free-ext-link', config = Parser.getConfig(), accum: Token[] = []) {
		super(url, config, accum, {
		});
		this.type = type;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		let rect: BoundingRect | undefined;
		if (this.type === 'magic-link') {
			const {link} = this;
			if (link.startsWith('ISBN')) {
				// eslint-disable-next-line unicorn/no-useless-spread
				const digits = [...link.slice(5)].map(s => s === 'X' ? 10 : Number(s));
				if (
					digits.length === 10 && digits.reduce((sum, d, i) => sum + d * (10 - i), 0) % 11
					|| digits.length === 13 && (
						digits[12] === 10
						|| digits.reduce((sum, d, i) => sum + d * (i % 2 ? 3 : 1), 0) % 10
					)
				) {
					rect = {start, ...this.getRootNode().posFromIndex(start)!};
					errors.push(generateForSelf(this, rect, 'invalid-isbn', 'invalid ISBN'));
				}
			}
			return errors;
		}
		const source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
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
