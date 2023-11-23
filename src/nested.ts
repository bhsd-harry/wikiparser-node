import {generateForChild} from '../util/lint';
import * as Parser from '../index';
import {Token} from './index';
import {ExtToken} from './tagPair/ext';
import {NoincludeToken} from './nowiki/noinclude';
import {CommentToken} from './nowiki/comment';
import type {LintError} from '../index';
import type {AttributesToken} from './attributes';

/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: ...ExtToken|NoincludeToken|CommentToken}`
 */
export class NestedToken extends Token {
	override readonly type = 'ext-inner';

	declare childNodes: (ExtToken | NoincludeToken | CommentToken)[];
	// @ts-expect-error abstract method
	abstract override get children(): (ExtToken | NoincludeToken | CommentToken)[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): ExtToken | undefined;

	/**
	 * @param regex 内层正则
	 * @param tags 内层标签名
	 */
	constructor(
		wikitext: string | undefined,
		regex: RegExp,
		tags: string[],
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		const text = wikitext?.replace(
			regex,
			(comment, name?: string, attr?: string, inner?: string, closing?: string) => {
				const str = `\0${accum.length + 1}${name ? 'e' : 'c'}\x7F`;
				if (name) {
					new ExtToken(name, attr, inner, closing, config, accum);
				} else {
					const closed = comment.endsWith('-->');
					new CommentToken(comment.slice(4, closed ? -3 : undefined), closed, config, accum);
				}
				return str;
			},
		)?.replace(
			/(?<=^|\0\d+[ce]\x7F)[^\0]+(?=$|\0\d+[ce]\x7F)/gu,
			substr => {
				new NoincludeToken(substr, config, accum);
				return `\0${accum.length}c\x7F`;
			},
		);
		super(text, config, accum, {
			NoincludeToken: ':', ExtToken: ':',
		});
		this.#tags = tags;
		this.#regex = regex;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		let rect: BoundingRect | undefined;
		return [
			...super.lint(start),
			...this.childNodes.filter(child => {
				if (child.type === 'ext' || child.type === 'comment') {
					return false;
				}
				const str = String(child).trim();
				return str && !/^<!--.*-->$/su.test(str);
			}).map(child => {
				rect ??= {start, ...this.getRootNode().posFromIndex(start)};
				return generateForChild(child, rect, Parser.msg('invalid content in <$1>', this.name));
			}),
		];
	}
}

Parser.classes['NestedToken'] = __filename;
