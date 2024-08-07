import {generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {ExtToken} from './tagPair/ext';
import {NoincludeToken} from './nowiki/noinclude';
import {CommentToken} from './nowiki/comment';
import type {LintError} from '../base';
import type {AttributesToken} from './attributes';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: ...ExtToken|NoincludeToken|CommentToken}`
 */
export abstract class NestedToken extends Token {
	declare readonly name: string;

	/* NOT FOR BROWSER */

	readonly #tags;
	readonly #regex;

	/* NOT FOR BROWSER END */

	declare readonly childNodes: readonly (ExtToken | NoincludeToken | CommentToken)[];
	abstract override get firstChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get lastChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): (ExtToken | NoincludeToken | CommentToken)[];
	abstract override get firstElementChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get lastElementChild(): ExtToken | NoincludeToken | CommentToken | undefined;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get nextElementSibling(): undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

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
			/(^|\0\d+[cne]\x7F)([^\0]+)(?=$|\0\d+[cne]\x7F)/gu,
			(_, lead: string, substr: string) => {
				// @ts-expect-error abstract class
				new NoincludeToken(substr, config, accum);
				return `${lead}\0${accum.length}n\x7F`;
			},
		);
		super(wikitext, config, accum, {
			NoincludeToken: ':', ExtToken: ':',
		});

		/* NOT FOR BROWSER */

		this.#tags = [...tags];
		this.#regex = regex;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const rect = new BoundingRect(this, start);
		return [
			...super.lint(start, re),
			...this.childNodes.filter(child => {
				if (child.type === 'ext' || child.type === 'comment') {
					return false;
				}
				const str = child.toString().trim();
				return str && !/^<!--.*-->$/su.test(str);
			}).map(child => {
				const e = generateForChild(child, rect, 'no-ignored', Parser.msg('invalid content in <$1>', this.name));
				e.suggestions = [
					{
						desc: 'remove',
						range: [e.startIndex, e.endIndex],
						text: '',
					},
					{
						desc: 'comment',
						range: [e.startIndex, e.endIndex],
						text: `<!--${child.toString()}-->`,
					},
				];
				return e;
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
			this.constructorError(`can only have ${this.#tags.join(' or ')} tags as child nodes`);
		}
		return super.insertAt(token, i);
	}

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
