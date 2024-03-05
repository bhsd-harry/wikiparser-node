import {generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from './index';
import {ExtToken} from './tagPair/ext';
import {NoincludeToken} from './nowiki/noinclude';
import {CommentToken} from './nowiki/comment';
import type {LintError} from '../base';
import type {AttributesToken} from './attributes';

/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: ...ExtToken|NoincludeToken|CommentToken}`
 */
export abstract class NestedToken extends Token {
	override readonly type = 'ext-inner';
	declare readonly name: string;

	declare readonly childNodes: readonly (ExtToken | NoincludeToken | CommentToken)[];
	abstract override get firstChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get lastChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/**
	 * @param regex 内层正则
	 * @param tags 内层标签名
	 */
	constructor(
		wikitext: string | undefined,
		regex: RegExp,
		tags: readonly string[],
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		wikitext = wikitext?.replace(
			regex,
			(comment, name?: string, attr?: string, inner?: string, closing?: string) => {
				const str = `\0${accum.length + 1}${name ? 'e' : 'c'}\x7F`;
				if (name) {
					// @ts-expect-error abstract class
					new ExtToken(name, attr, inner, closing, config, accum);
				} else {
					const closed = comment.endsWith('-->');
					// @ts-expect-error abstract class
					new CommentToken(comment.slice(4, closed ? -3 : undefined), closed, config, accum);
				}
				return str;
			},
		).replace(
			/(^|\0\d+[ce]\x7F)([^\0]+)(?=$|\0\d+[ce]\x7F)/gu,
			(_, lead: string, substr: string) => {
				// @ts-expect-error abstract class
				new NoincludeToken(substr, config, accum);
				return `${lead}\0${accum.length}c\x7F`;
			},
		);
		super(wikitext, config, accum, {
		});
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		let rect: BoundingRect | undefined;
		return [
			...super.lint(start, re),
			...this.childNodes.filter(child => {
				if (child.type === 'ext' || child.type === 'comment') {
					return false;
				}
				const str = String(child).trim();
				return str && !/^<!--.*-->$/su.test(str);
			}).map(child => {
				rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
				const e = generateForChild(child, rect, 'no-ignored', Parser.msg('invalid content in <$1>', this.name));
				e.suggestions = [
					{
						desc: 'remove',
						range: [e.startIndex, e.endIndex],
						text: '',
					},
					{
						desc: 'comment',
						range: [e.startIndex, e.startIndex],
						text: `<!--${String(child)}-->`,
					},
				];
				return e;
			}),
		];
	}
}
