import {generateForChild} from '../util/lint';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import * as Parser from '../index';
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

	/* NOT FOR BROWSER */

	readonly #tags: string[];
	readonly #regex;

	/* NOT FOR BROWSER END */

	declare readonly childNodes: readonly (ExtToken | NoincludeToken | CommentToken)[];
	abstract override get children(): (ExtToken | NoincludeToken | CommentToken)[];
	abstract override get firstChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get firstElementChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get lastChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get lastElementChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

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
					new CommentToken(comment.slice(4, closed ? -3 : undefined), closed, config, accum);
				}
				return str;
			},
		)?.replace(
			/(^|\0\d+[ce]\x7F)([^\0]+)(?=$|\0\d+[ce]\x7F)/gu,
			(_, lead: string, substr: string) => {
				new NoincludeToken(substr, config, accum);
				return `${lead}\0${accum.length}c\x7F`;
			},
		);
		super(wikitext, config, accum, {
			NoincludeToken: ':', ExtToken: ':',
		});
		this.#tags = [...tags];
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
				rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
				return generateForChild(child, rect, Parser.msg('invalid content in <$1>', this.name));
			}),
		];
	}

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	override insertAt<T extends Token>(token: T, i?: number): T {
		if (typeof token !== 'string' && token.type === 'ext' && !this.#tags.includes(token.name!)) {
			this.constructorError(`只能以 ${this.#tags.join(' 或 ')} 标签作为子节点`);
		}
		return super.insertAt(token, i);
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new NestedToken(undefined, this.#regex, this.#tags, config) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['NestedToken'] = __filename;
